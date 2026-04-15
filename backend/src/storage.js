const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const config = require("./config");
const { canonicalStringify } = require("./json");

async function ensureCasDir() {
  const casDir = path.join(config.dataDir, "cas");
  await fs.mkdir(casDir, { recursive: true });
  return casDir;
}

async function saveToLocalCas(metadata) {
  const casDir = await ensureCasDir();
  const canonical = canonicalStringify(metadata);
  const cid = crypto.createHash("sha256").update(canonical).digest("hex");
  const filePath = path.join(casDir, `${cid}.json`);

  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, `${canonical}\n`, "utf8");
  }

  return {
    metadataURI: `cas://${cid}`,
    storageSource: "local-cas",
    cid
  };
}

async function saveToIpfs(metadata) {
  if (!config.ipfsToken) {
    return null;
  }

  const payload = canonicalStringify(metadata);
  const response = await fetch(config.ipfsUploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.ipfsToken}`,
      "Content-Type": "application/json"
    },
    body: payload
  });

  if (!response.ok) {
    throw new Error(`IPFS upload failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json().catch(() => ({}));
  const cid = data.cid || (data.value && data.value.cid);

  if (!cid) {
    throw new Error("IPFS upload response did not contain cid");
  }

  return {
    metadataURI: `ipfs://${cid}`,
    storageSource: "ipfs",
    cid
  };
}

async function saveMetadata(metadata) {
  try {
    const remote = await saveToIpfs(metadata);
    if (remote) {
      return remote;
    }
  } catch {
    // Fallback to local CAS if IPFS upload errors.
  }

  return saveToLocalCas(metadata);
}

module.exports = {
  saveMetadata
};
