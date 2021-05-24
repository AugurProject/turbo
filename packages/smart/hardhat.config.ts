import "@nomiclabs/hardhat-waffle";
import "hardhat-deploy";
import "hardhat-contract-sizer";
import "hardhat-abi-exporter";
import "hardhat-docgen";
import "@tenderly/hardhat-tenderly";

import { HardhatUserConfig } from "hardhat/config";
import "./tasks";
import { mapOverObject, NULL_ADDRESS } from "./src/";
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
      deployConfig: {
        linkNode: "", // TODO need a real value
      },
    },
    arbitrumKovan4: {
      url: "https://kovan4.arbitrum.io/rpc",
      chainId: 212984383488152,
      gas: 200000000, // arbitrum has as higher gas limit and cost for contract deploys from contracts
      gasPrice: 1,
      deployConfig: {
        linkNode: "", // TODO need a real value
      },
    },
    maticMumbai: {
      url: "https://rpc-mumbai.maticvigil.com/v1/d955b11199dbfd5871c21bdc750c994edfa52abd",
      chainId: 80001,
      gas: 10000000, // to fit createPool calls, which fails to estimate gas correctly
      gasPrice: 20000000000,
      deployConfig: {
        linkNode: "0x6FBD37365bac1fC61EAb2b35ba4024B32b136be6",
      },
    },
    maticMainnet: {
      url: "https://rpc-mainnet.maticvigil.com/",
      chainId: 137,
      gas: 10000000, // to fit createPool calls, which fails to estimate gas correctly
      gasPrice: 20000000000,
      deployConfig: {
        linkNode: "0x6FBD37365bac1fC61EAb2b35ba4024B32b136be6",
        externalAddresses: {
          usdcToken: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
          // reputationToken: NULL_ADDRESS, // no staking fees yet
        },
      },
    },
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

export default config;
