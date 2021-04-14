import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-contract-sizer";
import "hardhat-abi-exporter";
import "hardhat-docgen";
import "@nomiclabs/hardhat-ethers";
import "@eth-optimism/plugins/hardhat/compiler";
import "@eth-optimism/plugins/hardhat/"; 
import '@eth-optimism/hardhat-ovm'
import '@typechain/hardhat'

import { HardhatUserConfig } from "hardhat/types";
import "./tasks";
import { mapOverObject } from "./src";
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
      gas: 6000000, // to fit createPool calls, which fails to estimate gas correctly
    },
    arbitrumKovan4: {
      url: "https://kovan4.arbitrum.io/rpc",
      chainId: 212984383488152,
      gas: 200000000, // arbitrum has as higher gas limit and cost for contract deploys from contracts
      gasPrice: 1,
    },
    maticMumbai: {
      url: "https://rpc-mumbai.maticvigil.com/v1/d955b11199dbfd5871c21bdc750c994edfa52abd",
      chainId: 80001,
      gas: 6000000, // to fit createPool calls, which fails to estimate gas correctly
      gasPrice: 20000000000,
    },
    optimism: {
      url: "http://127.0.0.1:8545", //"https://kovan.optimism.io",
      chainId: 420,
      accounts: {
        mnemonic: 'test test test test test test test test test test test junk'
      },
      ovm: true, 
      gasPrice: 0,
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
