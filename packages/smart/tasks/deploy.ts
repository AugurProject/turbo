import { extendConfig, HardhatUserConfig, task } from "hardhat/config";
import { ethers } from "ethers";

import { updateAddressConfig } from "../src/addressesConfigUpdater";
import path from "path";
import "@nomiclabs/hardhat-etherscan";

import {
  ContractDeployConfig,
  Deploy,
  Deployer,
  EthersFastSubmitWallet,
  isContractDeployTestConfig,
  mapOverObject,
} from "../src";
import "hardhat/types/config";
import {
  HardhatConfig,
  HardhatNetworkAccountConfig,
  HardhatNetworkAccountsConfig,
  HardhatNetworkConfig,
  HardhatRuntimeEnvironment,
  HttpNetworkUserConfig,
  NetworkUserConfig,
  HttpNetworkConfig,
  NetworkConfig,
} from "hardhat/types";

task("deploy", "Deploy Turbo").setAction(async (args, hre) => {
  if (!hre.config.contractDeploy) throw Error(`When deploying you must specify deployConfig in the hardhat config`);

  const signer = await makeSigner(hre);
  const confirmations = isHttpNetworkConfig(hre.network.config) ? hre.network.config.confirmations : 0;
  const deployer = new Deployer(signer, confirmations);

  let deploy: Deploy;
  const network = await hre.ethers.provider.getNetwork();

  if (isContractDeployTestConfig(hre.config.contractDeploy)) {
    deploy = await deployer.deployTest();
  } else {
    const { externalAddresses } = hre.config.contractDeploy;
    deploy = await deployer.deployProduction(externalAddresses);
  }

  console.log(JSON.stringify(deploy, null, 2));

  const addressFilePath = path.resolve(__dirname, "../addresses.ts");
  updateAddressConfig(addressFilePath, network.chainId, deploy.addresses);

  // Verify deploy
  if (hre.config.etherscan?.apiKey && deploy?.addresses && ["kovan", "mainnet"].includes(hre.network.name)) {
    console.log("Verifying deployment");
    await hre.run("verifyDeploy", {
      account: await signer.getAddress(),
      addresses: JSON.stringify(deploy.addresses),
    });
  } else {
    console.log("Skipping verification of deployment");
  }
});

declare module "hardhat/types/config" {
  export interface HardhatUserConfig {
    contractDeploy?: ContractDeployConfig;
  }

  export interface HardhatConfig {
    contractDeploy?: ContractDeployConfig;
  }

  export interface HttpNetworkUserConfig {
    confirmations?: number; // how many confirmations to wait after issuing a transaction
  }

  export interface HttpNetworkConfig {
    confirmations: number; // how many confirmations to wait after issuing a transaction
  }
}

extendConfig((config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
  if (!userConfig.networks) return;

  mapOverObject(userConfig.networks, (name, networkConfig) => {
    if (isHttpNetworkUserConfig(networkConfig)) {
      (config.networks[name] as HttpNetworkConfig).confirmations =
        networkConfig.confirmations === undefined ? 0 : networkConfig.confirmations;
    }
    return [name, networkConfig];
  });
});

export function isHttpNetworkConfig(networkConfig?: NetworkConfig): networkConfig is HttpNetworkConfig {
  return (networkConfig as HttpNetworkConfig)?.url !== undefined;
}

export function isHttpNetworkUserConfig(networkConfig?: NetworkUserConfig): networkConfig is HttpNetworkUserConfig {
  return (networkConfig as HttpNetworkUserConfig)?.url !== undefined; // will always need a url anyway
}

export function isHardhatNetworkConfig(networkConfig: NetworkConfig): networkConfig is HardhatNetworkConfig {
  return (networkConfig as HttpNetworkConfig).url === undefined;
}

export function isHardhatNetworkAccountConfig(
  accountConfig: HardhatNetworkAccountsConfig
): accountConfig is HardhatNetworkAccountConfig[] {
  return Array.isArray(accountConfig);
}

export async function makeSigner(hre: HardhatRuntimeEnvironment): Promise<ethers.Signer> {
  const provider = hre.ethers.provider;

  // talk to a node
  if (isHttpNetworkConfig(hre.network.config) && Array.isArray(hre.network.config.accounts)) {
    const { accounts, gas, gasPrice } = hre.network.config;
    const [privateKey] = accounts;
    const wallet = await EthersFastSubmitWallet.create(privateKey, provider);
    wallet.gasLimit = gas;
    wallet.gasPrice = gasPrice;
    return wallet;
  } else if (isHardhatNetworkConfig(hre.network.config)) {
    if (isHardhatNetworkAccountConfig(hre.network.config.accounts)) {
      const { accounts } = hre.network.config;
      const [account] = accounts;
      const { privateKey } = account;
      return EthersFastSubmitWallet.create(privateKey, provider);
    }
  }

  const [signer] = await hre.ethers.getSigners();
  return signer;
}
