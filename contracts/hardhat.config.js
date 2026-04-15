require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.ISSUER_PRIVATE_KEY || "";

module.exports = {
  solidity: "0.8.24",
  networks: {
    hardhat: {},
    amoy: {
      url: process.env.AMOY_RPC_URL || "",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : []
    }
  }
};
