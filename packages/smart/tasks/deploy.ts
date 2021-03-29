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
import { HardhatRuntimeEnvironment } from "hardhat/types";

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

export async function makeSigner(hre: HardhatRuntimeEnvironment): Promise<ethers.Signer> {
  const [signer] = await hre.ethers.getSigners();

  // talk to a node
  if (isHttpNetworkConfig(hre.network.config) && Array.isArray(hre.network.config.accounts)) {
    const { accounts } = hre.network.config;
    const [privateKey] = accounts;

    if (!signer.provider) throw Error("Hardhat's signer is missing a provider");

    return EthersFastSubmitWallet.create(privateKey, signer.provider);
  }
  return signer;
}
