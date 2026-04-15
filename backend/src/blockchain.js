const { ethers } = require("ethers");
const config = require("./config");
const abi = require("./abi");

function ensureChainConfig() {
  if (!config.rpcUrl) {
    throw new Error("RPC_URL is missing in backend/.env");
  }
  if (!config.contractAddress) {
    throw new Error("CONTRACT_ADDRESS is missing in backend/.env");
  }
}

function getProvider() {
  ensureChainConfig();
  return new ethers.JsonRpcProvider(config.rpcUrl);
}

function getReadContract() {
  return new ethers.Contract(config.contractAddress, abi, getProvider());
}

function getIssuerContract() {
  ensureChainConfig();

  if (!config.issuerPrivateKey) {
    throw new Error("ISSUER_PRIVATE_KEY is missing in backend/.env");
  }

  const signer = new ethers.Wallet(config.issuerPrivateKey, getProvider());
  return new ethers.Contract(config.contractAddress, abi, signer);
}

function normalizeCredential(raw) {
  return {
    id: raw.id,
    studentId: raw.studentId,
    studentWallet: raw.studentWallet,
    credentialType: raw.credentialType,
    title: raw.title,
    institution: raw.institution,
    metadataURI: raw.metadataURI,
    metadataHash: raw.metadataHash,
    issuedAt: Number(raw.issuedAt),
    revoked: raw.revoked,
    issuer: raw.issuer
  };
}

async function issueCredentialOnChain(input) {
  const contract = getIssuerContract();

  const tx = await contract.issueCredential(
    input.studentId,
    input.studentWallet,
    input.credentialType,
    input.title,
    input.institution,
    input.metadataURI,
    input.metadataHash
  );

  const receipt = await tx.wait();
  let credentialId = null;

  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed && parsed.name === "CredentialIssued") {
        credentialId = parsed.args.credentialId;
        break;
      }
    } catch {
      // Ignore non-contract logs.
    }
  }

  if (!credentialId) {
    throw new Error("CredentialIssued event not found in transaction receipt");
  }

  return {
    credentialId,
    txHash: receipt.hash,
    blockNumber: Number(receipt.blockNumber)
  };
}

async function verifyCredentialOnChain(credentialId, metadataHash) {
  const contract = getReadContract();
  const result = await contract.verifyCredential(credentialId, metadataHash);

  return {
    exists: Boolean(result.exists),
    valid: Boolean(result.valid),
    revoked: Boolean(result.revoked)
  };
}

async function getCredentialById(credentialId) {
  const contract = getReadContract();
  const raw = await contract.getCredential(credentialId);
  return normalizeCredential(raw);
}

async function listAllCredentials() {
  const contract = getReadContract();
  const ids = await contract.getAllCredentialIds();

  const entries = await Promise.all(
    ids.map(async (id) => {
      const raw = await contract.getCredential(id);
      return normalizeCredential(raw);
    })
  );

  return entries;
}

async function listStudentCredentials(studentId) {
  const contract = getReadContract();
  const ids = await contract.getStudentCredentialIds(studentId);

  const entries = await Promise.all(
    ids.map(async (id) => {
      const raw = await contract.getCredential(id);
      return normalizeCredential(raw);
    })
  );

  return entries;
}

async function grantViewerAccess({ credentialId, studentPrivateKey, viewerAddress, expiresAt }) {
  if (!studentPrivateKey) {
    throw new Error("studentPrivateKey is required to sign access transaction");
  }

  const provider = getProvider();
  const studentSigner = new ethers.Wallet(studentPrivateKey, provider);
  const contract = new ethers.Contract(config.contractAddress, abi, studentSigner);

  const tx = await contract.grantViewerAccess(credentialId, viewerAddress, BigInt(expiresAt));
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    blockNumber: Number(receipt.blockNumber)
  };
}

async function canViewerAccess(credentialId, viewerAddress) {
  const contract = getReadContract();
  const allowed = await contract.canViewerAccess(credentialId, viewerAddress);
  const accessUntil = await contract.viewerAccessUntil(credentialId, viewerAddress);

  return {
    allowed: Boolean(allowed),
    accessUntil: Number(accessUntil)
  };
}

module.exports = {
  issueCredentialOnChain,
  verifyCredentialOnChain,
  getCredentialById,
  listAllCredentials,
  listStudentCredentials,
  grantViewerAccess,
  canViewerAccess
};
