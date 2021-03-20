// Our monolithic configuration object.

// TODO give this its own package

export interface Configuration {
  contractDeploy?: ContractDeployConfig;
  etherscanVerification?: EtherscanVerificationConfig; // TODO use this for full verification, not the one-offs hardhat makes easy
}

// Deploy Contracts

export type ContractDeployConfig = ContractDeployTestConfig | ContractDeployProductionConfig;
export interface ContractDeployCommonConfig {
  rpcURL: string;
  chainID: number;
}
export interface ContractDeployTestConfig extends ContractDeployCommonConfig {
  strategy: "test";
}
export interface ContractDeployProductionConfig extends ContractDeployCommonConfig {
  strategy: "production";
  externalAddresses: ContractDeployExternalAddresses;
}

export interface ContractDeployExternalAddresses {
  reputationToken: string;
}

export function isContractDeployTestConfig(thing?: ContractDeployConfig): thing is ContractDeployTestConfig {
  return thing?.strategy === "test";
}
export function isContractDeployProductionConfig(
  thing?: ContractDeployConfig
): thing is ContractDeployProductionConfig {
  return thing?.strategy === "production";
}

// Contract Verification

export interface EtherscanVerificationConfig {
  apiKey: string;
}
