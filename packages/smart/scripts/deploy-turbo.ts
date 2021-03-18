// This script must be run through "yarn ts-node <script.ts>".

import program from "commander";
import { Option } from "commander";
import * as hre from "hardhat"; // imported for IDEs; is injected into globals by hardhat
import { ethers } from "ethers";

import { Deployer, Environment, environments } from "../src";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

interface ParseOptions {
  environment: Environment;
}

function parse(): ParseOptions {
  program
    .name("deploy-turbo")
    .storeOptionsAsProperties(false)
    .addOption(
      new Option("-e, --environment <network>", `Name of environment config to use`)
        .choices(Object.keys(environments))
        .makeOptionMandatory()
    );

  if (process.argv.length < 3) return program.help();
  return program.parse().opts() as ParseOptions;
}

async function main() {
  const { environment } = parse();
  const config = environments[environment];
  if (!config.contractDeploy) throw Error("Must specify contractDeploy in config");

  const { rpcURL, chainID } = config.contractDeploy;
  const provider = new ethers.providers.JsonRpcProvider(rpcURL, chainID);
  const signer = await SignerWithAddress.create(provider.getSigner());

  const deployer = new Deployer(signer, config);
  const addresses = await deployer.deployTest();
  console.log(JSON.stringify(addresses, null, 2));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
