const fs = require("fs/promises");
const path = require("path");
const config = require("./config");

const dbPath = path.join(config.dataDir, "registry.json");

async function ensureDb() {
  await fs.mkdir(config.dataDir, { recursive: true });

  try {
    await fs.access(dbPath);
  } catch {
    const initial = {
      credentials: {},
      shares: []
    };
    await fs.writeFile(dbPath, `${JSON.stringify(initial, null, 2)}\n`, "utf8");
  }
}

async function readDb() {
  await ensureDb();
  const raw = await fs.readFile(dbPath, "utf8");
  return JSON.parse(raw);
}

async function writeDb(db) {
  await fs.writeFile(dbPath, `${JSON.stringify(db, null, 2)}\n`, "utf8");
}

async function saveCredential(credentialId, record) {
  const db = await readDb();
  db.credentials[credentialId] = record;
  await writeDb(db);
}

async function getCredential(credentialId) {
  const db = await readDb();
  return db.credentials[credentialId] || null;
}

async function listCredentials() {
  const db = await readDb();
  return Object.values(db.credentials);
}

async function addShare(share) {
  const db = await readDb();
  db.shares.push(share);
  await writeDb(db);
}

module.exports = {
  saveCredential,
  getCredential,
  listCredentials,
  addShare
};
