// Our monolithic configuration object.

// TODO give this its own package

export interface Configuration {
  contractDeploy?: ContractDeployConfig;
}
export type ContractDeployConfig = ContractDeployTestConfig | ContractDeployProductionConfig;
export interface ContractDeployTestConfig {
  strategy: "test";
}
export interface ContractDeployProductionConfig {
  strategy: "production";
  externalAddresses: ContractDeployExternalAddresses;
}

export interface ContractDeployExternalAddresses {
  collateral: string;
  reputationToken: string;
}

export function isContractDeployTestConfig(thing?: ContractDeployConfig): thing is ContractDeployTestConfig {
  return thing?.strategy === "test";
}
export function isContractDeployProductionConfig(thing?: ContractDeployConfig): thing is ContractDeployProductionConfig {
  return thing?.strategy === "production";
}