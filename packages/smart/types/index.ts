import { ContractDeployConfig, EtherscanVerificationConfig } from "../src";

declare module "hardhat/types/config" {
  export interface HardhatUserConfig {
    contractDeploy?: ContractDeployConfig;
    etherscanVerification?: EtherscanVerificationConfig;
  }

  export interface HardhatConfig {
    contractDeploy?: ContractDeployConfig;
    etherscanVerification?: EtherscanVerificationConfig;
  }
}
