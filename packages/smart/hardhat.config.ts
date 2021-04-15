import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-contract-sizer";
import "hardhat-abi-exporter";
import "hardhat-docgen";

import { HardhatUserConfig } from "hardhat/config";
import "./tasks";
import { mapOverObject } from "./src/";
import { NetworkUserConfig } from "hardhat/types";

const ETHERSCAN_API_KEY = process.env["ETHERSCAN_API_KEY"] || "CH7M2ATCZABP2GIHEF3FREWWQPDFQBSH8G";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.7.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.6.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
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
      gas: 9000000, // to fit createPool calls, which fails to estimate gas correctly
      confirmations: 1,
      linkAddress: "0xa36085F69e2889c224210F603D836748e7dC0088",
      oracleAddress: "0x56dd6586DB0D08c6Ce7B2f2805af28616E082455",
      jobID: "dbb65efc02d34cddb920eca1bec22ade",
    },
    arbitrumKovan4: {
      url: "https://kovan4.arbitrum.io/rpc",
      chainId: 212984383488152,
      gas: 200000000, // arbitrum has as higher gas limit and cost for contract deploys from contracts
      gasPrice: 1,
      confirmations: 2,
    },
    maticMumbai: {
      url: "https://rpc-mumbai.maticvigil.com/v1/d955b11199dbfd5871c21bdc750c994edfa52abd",
      chainId: 80001,
      gas: 6000000, // to fit createPool calls, which fails to estimate gas correctly
      gasPrice: 20000000000,
      confirmations: 10,
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
if (PRIVATE_KEY && config.networks) {
  config.networks = mapOverObject(config.networks, (network: string, config?: NetworkUserConfig) => {
    if (network !== "hardhat" && config) config.accounts = [PRIVATE_KEY];
    return [network, config];
  });
}

if (ETHERSCAN_API_KEY) config.etherscan = { apiKey: ETHERSCAN_API_KEY };

export default config;
