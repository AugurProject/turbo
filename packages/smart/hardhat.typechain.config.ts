// This file is needed because many of our hardhat tasks rely on typechain, creating a circular dependency.

import "hardhat-typechain";

import { HardhatUserConfig } from "hardhat/config";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.7.3",
        settings: {}
      },
      {
        version: "0.5.15",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ]
  }
};

export default config;
