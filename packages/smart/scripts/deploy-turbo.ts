// This script must be run through "yarn hardhat run <script.ts>.

import * as hre from "hardhat"; // imported for IDEs; is injected into globals by hardhat
import { Deployer, environments } from "../src";

async function main() {
  const [signer] = await hre.ethers.getSigners();
  const config = environments.local;

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
