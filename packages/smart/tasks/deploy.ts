import { task } from "hardhat/config";

import {
  ContractDeployConfig,
  Deploy,
  Deployer,
  EtherscanVerificationConfig,
  isContractDeployTestConfig,
} from "../src";
import { updateAddressConfig } from "../src/addressesConfigUpdater";
import path from "path";

import "hardhat/types/config";

task("deploy", "Deploy Turbo").setAction(async (args, hre) => {
  if (!hre.config.contractDeploy) throw Error(`When deploying you must specify deployConfig in the hardhat config`);

  const [signer] = await hre.ethers.getSigners();
  const deployer = new Deployer(signer);

  let deploy: Deploy;
  let networkId = await signer.getNetworkId();

  if (isContractDeployTestConfig(hre.config.contractDeploy)) {
    deploy = await deployer.deployTest();
    deploy.turboId = deploy.turboId.toString();
  } else {
    const { externalAddresses } = hre.config.contractDeploy;
    deploy = await deployer.deployProduction(externalAddresses);
  }

  const addressFilePath = path.resolve(__dirname, "../addresses.ts");
  updateAddressConfig(addressFilePath, networkId, deploy.addresses);

  console.log(JSON.stringify(deploy, null, 2));
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
