// This file is needed because many of our hardhat tasks rely on typechain, creating a circular dependency.

import "hardhat-typechain";

import { HardhatUserConfig } from "hardhat/config";
import { SOLIDITY } from "./hardhatCommon";

const config: HardhatUserConfig = {
  solidity: SOLIDITY
};

export default config;
