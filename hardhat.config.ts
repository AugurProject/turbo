import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-typechain";

import { task, HardhatUserConfig } from "hardhat/config";


// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (args, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
const config: HardhatUserConfig = {
  solidity: "0.7.3",
  networks: {
    hardhat: {},
    kovan: {
      url: "https://kovan.infura.io/v3/595111ad66e2410784d484708624f7b1",
    }
  },
};

const PRIVATE_KEY = process.env['PRIVATE_KEY'];
if (PRIVATE_KEY) module.exports.networks.kovan.accounts = [PRIVATE_KEY];

const ETHERSCAN_API_KEY = process.env['ETHERSCAN_API_KEY']
if (ETHERSCAN_API_KEY) module.exports.etherscan = { apiKey: ETHERSCAN_API_KEY}

export default config;
