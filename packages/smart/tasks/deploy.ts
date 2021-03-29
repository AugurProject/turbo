import { task } from "hardhat/config";
import { ethers } from "ethers";

import { updateAddressConfig } from "../src/addressesConfigUpdater";
import path from "path";
import "@nomiclabs/hardhat-etherscan";

import {
  ContractDeployConfig,
  Deploy,
  Deployer,
  EtherscanVerificationConfig,
  EthersFastSubmitWallet,
  isContractDeployTestConfig,
} from "../src";
import "hardhat/types/config";
import { HttpNetworkConfig, NetworkConfig } from "hardhat/src/types/config";
import {
  HardhatNetworkAccountConfig,
  HardhatNetworkAccountsConfig,
  HardhatNetworkConfig,
  HardhatRuntimeEnvironment,
} from "hardhat/types";

task("deploy", "Deploy Turbo").setAction(async (args, hre) => {
  if (!hre.config.contractDeploy) throw Error(`When deploying you must specify deployConfig in the hardhat config`);

  const signer = await makeSigner(hre);
  const deployer = new Deployer(signer);

  let deploy: Deploy;
  const network = await hre.ethers.provider.getNetwork();

  if (isContractDeployTestConfig(hre.config.contractDeploy)) {
    deploy = await deployer.deployTest();
    deploy.turboId = deploy.turboId.toString();
  } else {
    const { externalAddresses } = hre.config.contractDeploy;
    deploy = await deployer.deployProduction(externalAddresses);
  }

  // Verify deploy
  if (hre.network.name !== "localhost" && deploy && deploy.addresses) {
    await hre.run("verifyDeploy", {
      account: await signer.getAddress(),
      addresses: JSON.stringify(deploy.addresses),
    });
  }

  console.log(JSON.stringify(deploy, null, 2));

  const addressFilePath = path.resolve(__dirname, "../addresses.ts");
  updateAddressConfig(addressFilePath, network.chainId, deploy.addresses);
});

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

export function isHttpNetworkConfig(networkConfig: NetworkConfig): networkConfig is HttpNetworkConfig {
  return (networkConfig as HttpNetworkConfig).url !== undefined;
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
