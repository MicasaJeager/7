const { ethers } = require("ethers");

function canonicalStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalStringify(item)).join(",")}]`;
  }

  const keys = Object.keys(value).sort();
  const items = keys.map((key) => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`);
  return `{${items.join(",")}}`;
}

function metadataHash(metadata) {
  const canonical = canonicalStringify(metadata);
  return ethers.keccak256(ethers.toUtf8Bytes(canonical));
}

module.exports = {
  canonicalStringify,
  metadataHash
};
