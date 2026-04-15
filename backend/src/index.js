const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");

const config = require("./config");
const { metadataHash } = require("./json");
const { saveMetadata } = require("./storage");
const store = require("./store");
const chain = require("./blockchain");

const app = express();

const corsOrigin = config.frontendOrigin === "*"
  ? true
  : config.frontendOrigin.split(",").map((item) => item.trim());

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "education-chain-backend",
    time: new Date().toISOString()
  });
});

function requireFields(body, fields) {
  const missing = fields.filter((name) => body[name] === undefined || body[name] === null || body[name] === "");
  if (missing.length) {
    throw new Error(`Missing required fields: ${missing.join(", ")}`);
  }
}

function buildCredentialMetadata(payload) {
  return {
    studentId: payload.studentId,
    studentWallet: payload.studentWallet,
    credentialType: payload.credentialType,
    title: payload.title,
    institution: payload.institution,
    details: payload.details || {},
    issuedAtIso: new Date().toISOString()
  };
}

async function issueCredential(payload) {
  requireFields(payload, ["studentId", "studentWallet", "credentialType", "title", "institution"]);

  if (!ethers.isAddress(payload.studentWallet)) {
    throw new Error("studentWallet must be a valid EVM address");
  }

  const metadata = buildCredentialMetadata(payload);
  const hash = metadataHash(metadata);
  const storage = await saveMetadata(metadata);

  const chainResult = await chain.issueCredentialOnChain({
    studentId: payload.studentId,
    studentWallet: payload.studentWallet,
    credentialType: payload.credentialType,
    title: payload.title,
    institution: payload.institution,
    metadataURI: storage.metadataURI,
    metadataHash: hash
  });

  const record = {
    credentialId: chainResult.credentialId,
    txHash: chainResult.txHash,
    blockNumber: chainResult.blockNumber,
    metadataURI: storage.metadataURI,
    metadataHash: hash,
    storageSource: storage.storageSource,
    metadata,
    createdAt: new Date().toISOString()
  };

  await store.saveCredential(chainResult.credentialId, record);

  return record;
}

app.post("/api/credentials/issue", async (req, res) => {
  try {
    const record = await issueCredential(req.body);
    res.status(201).json(record);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/courses/result", async (req, res) => {
  try {
    requireFields(req.body, ["studentId", "studentWallet", "courseName", "platform", "score"]);

    const payload = {
      studentId: req.body.studentId,
      studentWallet: req.body.studentWallet,
      credentialType: "course-result",
      title: `${req.body.courseName} result`,
      institution: req.body.platform,
      details: {
        courseName: req.body.courseName,
        platform: req.body.platform,
        score: req.body.score,
        grade: req.body.grade || null,
        completedAt: req.body.completedAt || new Date().toISOString()
      }
    };

    const record = await issueCredential(payload);
    res.status(201).json(record);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/credentials/verify", async (req, res) => {
  try {
    requireFields(req.body, ["credentialId"]);

    let hash = req.body.metadataHash || "";

    if (!hash && req.body.metadata) {
      hash = metadataHash(req.body.metadata);
    }

    if (!hash) {
      const saved = await store.getCredential(req.body.credentialId);
      hash = saved ? saved.metadataHash : "";
    }

    if (!hash) {
      throw new Error("metadataHash or metadata is required for verification");
    }

    const result = await chain.verifyCredentialOnChain(req.body.credentialId, hash);

    res.json({
      credentialId: req.body.credentialId,
      metadataHash: hash,
      ...result
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/credentials", async (_req, res) => {
  try {
    const [chainCredentials, localRecords] = await Promise.all([
      chain.listAllCredentials(),
      store.listCredentials()
    ]);

    const localById = Object.fromEntries(localRecords.map((record) => [record.credentialId, record]));
    const merged = chainCredentials.map((item) => ({
      ...item,
      local: localById[item.id] || null
    }));

    res.json(merged);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/students/:studentId/credentials", async (req, res) => {
  try {
    const records = await chain.listStudentCredentials(req.params.studentId);
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/access/grant", async (req, res) => {
  try {
    requireFields(req.body, ["credentialId", "studentPrivateKey", "viewerAddress"]);

    if (!ethers.isAddress(req.body.viewerAddress)) {
      throw new Error("viewerAddress must be a valid EVM address");
    }

    const expiresAt = req.body.expiresAt
      ? Number(req.body.expiresAt)
      : Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;

    if (!Number.isFinite(expiresAt)) {
      throw new Error("expiresAt must be unix timestamp in seconds");
    }

    const txResult = await chain.grantViewerAccess({
      credentialId: req.body.credentialId,
      studentPrivateKey: req.body.studentPrivateKey,
      viewerAddress: req.body.viewerAddress,
      expiresAt
    });

    await store.addShare({
      credentialId: req.body.credentialId,
      viewerAddress: req.body.viewerAddress,
      expiresAt,
      txHash: txResult.txHash,
      createdAt: new Date().toISOString()
    });

    res.status(201).json({
      credentialId: req.body.credentialId,
      viewerAddress: req.body.viewerAddress,
      expiresAt,
      txHash: txResult.txHash,
      blockNumber: txResult.blockNumber
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/access/check", async (req, res) => {
  try {
    requireFields(req.query, ["credentialId", "viewerAddress"]);

    if (!ethers.isAddress(req.query.viewerAddress)) {
      throw new Error("viewerAddress must be a valid EVM address");
    }

    const result = await chain.canViewerAccess(req.query.credentialId, req.query.viewerAddress);

    res.json({
      credentialId: req.query.credentialId,
      viewerAddress: req.query.viewerAddress,
      allowed: result.allowed,
      accessUntil: result.accessUntil
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/registry/unified", async (_req, res) => {
  try {
    const records = await chain.listAllCredentials();
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(config.port, () => {
  console.log(`Backend running on http://localhost:${config.port}`);
});
