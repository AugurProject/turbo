import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-contract-sizer";
import "hardhat-abi-exporter";
import "hardhat-docgen";

import { HardhatUserConfig } from "hardhat/config";

// add tasks in task directory and import here
import "./tasks/balance.ts";
import "./tasks/accounts.ts";
import "./tasks/deploy.ts";
import "./tasks/verifyDeploy.ts";

const ETHERSCAN_API_KEY = process.env["ETHERSCAN_API_KEY"] || "CH7M2ATCZABP2GIHEF3FREWWQPDFQBSH8G";

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
  docgen: {
    path: "./docs",
    clear: true,
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
};

const PRIVATE_KEY = process.env["PRIVATE_KEY"];
if (PRIVATE_KEY && config.networks?.kovan) {
  config.networks.kovan.accounts = [PRIVATE_KEY];
}

if (ETHERSCAN_API_KEY) config.etherscan = { apiKey: ETHERSCAN_API_KEY };

export default config;
