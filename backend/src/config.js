const path = require("path");
require("dotenv").config();

module.exports = {
  port: Number(process.env.PORT || 4000),
  frontendOrigin: process.env.FRONTEND_ORIGIN || "*",
  rpcUrl: process.env.RPC_URL || "",
  contractAddress: process.env.CONTRACT_ADDRESS || "",
  issuerPrivateKey: process.env.ISSUER_PRIVATE_KEY || "",
  ipfsToken: process.env.IPFS_TOKEN || "",
  ipfsUploadUrl: process.env.IPFS_UPLOAD_URL || "https://api.web3.storage/upload",
  dataDir: path.resolve(__dirname, "..", "data")
};
