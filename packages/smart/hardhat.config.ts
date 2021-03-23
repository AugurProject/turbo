import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-typechain";
import "hardhat-contract-sizer";

import { task, HardhatUserConfig, types, extendConfig } from "hardhat/config";
import {
  ContractDeployConfig,
  ContractDeployProductionConfig,
  ContractDeployTestConfig,
  HardhatRuntimeEnvironment,
} from "hardhat/types";
import { Deploy, Deployer } from "./src";

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (args, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

task("deploy", "Deploy Turbo").setAction(async (args, hre: HardhatRuntimeEnvironment) => {
  if (!hre.config.contractDeploy) throw Error(`When deploying you must specify deployConfig in the hardhat config`);

  const [signer] = await hre.ethers.getSigners();
  const deployer = new Deployer(signer);

  let deploy: Deploy;
  if (isContractDeployTestConfig(hre.config.contractDeploy)) {
    deploy = await deployer.deployTest();
    deploy.turboId = deploy.turboId.toString();
  } else {
    const { externalAddresses } = hre.config.contractDeploy;
    deploy = await deployer.deployProduction(externalAddresses);
  }

  console.log(JSON.stringify(deploy, null, 2));
});

declare module "hardhat/types/config" {
  export interface HardhatUserConfig {
    contractDeploy?: ContractDeployConfig;
    etherscanVerification?: EtherscanVerificationConfig; // TODO use this for full verification, not the one-offs hardhat makes easy
  }

  export interface HardhatConfig {
    contractDeploy?: ContractDeployConfig;
    etherscanVerification?: EtherscanVerificationConfig; // TODO use this for full verification, not the one-offs hardhat makes easy
  }

  export type DeployStrategy = "test" | "production";

  export type ContractDeployConfig = ContractDeployTestConfig | ContractDeployProductionConfig;
  export interface ContractDeployCommonConfig {
    strategy: DeployStrategy;
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

  // Contract Verification

  export interface EtherscanVerificationConfig {
    apiKey: string;
  }

  // We also extend the Config type, which represents the configuration
  // after it has been resolved. This is the type used during the execution
  // of tasks, tests and scripts.
  // Normally, you don't want things to be optional here. As you can apply
  // default values using the extendConfig function.
  export interface ProjectPathsConfig {
    newPath: string;
  }
}

export function isContractDeployTestConfig(thing?: ContractDeployConfig): thing is ContractDeployTestConfig {
  return thing?.strategy === "test";
}
export function isContractDeployProductionConfig(
  thing?: ContractDeployConfig
): thing is ContractDeployProductionConfig {
  return thing?.strategy === "production";
}

extendConfig((config, userConfig) => {});

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.7.3",
        settings: {},
      },
      {
        version: "0.5.15",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {},
    kovan: {
      url: "https://kovan.infura.io/v3/595111ad66e2410784d484708624f7b1",
    },
  },
  contractDeploy: {
    strategy: "test",
  },
};

const PRIVATE_KEY = process.env["PRIVATE_KEY"];
if (PRIVATE_KEY && config.networks?.kovan) {
  config.networks.kovan.accounts = [PRIVATE_KEY];
}

const ETHERSCAN_API_KEY = process.env["ETHERSCAN_API_KEY"] || "CH7M2ATCZABP2GIHEF3FREWWQPDFQBSH8G";
if (ETHERSCAN_API_KEY) config.etherscan = { apiKey: ETHERSCAN_API_KEY };

export default config;
