import { JsonRpcSigner, Web3Provider } from "@ethersproject/providers";
import { ChainId } from "@uniswap/sdk";
import { Contract, ethers } from "ethers";
import { AddressZero } from "@ethersproject/constants";
import { MATIC_MUMBAI_RPC_DATA, MATIC_RPC_DATA, SUPPORTED_WALLETS } from "../constants";
import { WalletConnectConnector } from "@web3-react/walletconnect-connector";
import { UnsupportedChainIdError } from "@web3-react/core";
import { PARA_CONFIG } from "../../../stores/constants";
import  Web3HttpProvider from "web3-providers-http";

const ETHERSCAN_PREFIXES: { [chainId in ChainId]: string } = {
  1: "",
  3: "ropsten.",
  4: "rinkeby.",
  5: "goerli.",
  42: "kovan.",
};

export const CHAIN_ID_NAMES = {
  1: "Mainnet",
  42: "Kovan.",
  80001: "Mumbai.",
  137: "Matic.",
};

export const MATIC_MAINNET = 137;
export const MATIC_MUMBAI = 80001;
export const MATIC_CHAINS = [
  MATIC_MAINNET, MATIC_MUMBAI
];

export const getRpcData = () => {
  const networkId = PARA_CONFIG.networkId;
  const RPC_DATA = Number(networkId) === MATIC_MUMBAI ? MATIC_MUMBAI_RPC_DATA : MATIC_RPC_DATA;
  return RPC_DATA;
}

let defaultProvider = null;
export const getDefaultProvider = () => {
  const rpcData = getRpcData();
  const httpProvider = new Web3HttpProvider(rpcData.rpcUrls[0]);
  if (!defaultProvider){
    defaultProvider = new Web3Provider(httpProvider, 'any');
  } 
  return defaultProvider;
  
}

export const isAddress = (value) => {
  try {
    return ethers.utils.getAddress(value.toLowerCase());
  } catch {
    return false;
  }
};

export function getEtherscanLink(
  chainId: ChainId,
  data: string,
  type: "transaction" | "market" | "address" | "block"
): string {
  let prefix = `https://${ETHERSCAN_PREFIXES[chainId] || ETHERSCAN_PREFIXES[1]}etherscan.io`;

  // TODO remove when etherscan supports Matic
  if (MATIC_CHAINS.includes(chainId)) {
    prefix = `https://explorer-${chainId === MATIC_MAINNET ? 'mainnet' : 'mumbai'}.maticvigil.com`;
  }

  switch (type) {
    case "transaction": {
      return `${prefix}/tx/${data}`;
    }
    case "market": {
      return `${prefix}/token/${data}`;
    }
    case "block": {
      return `${prefix}/block/${data}`;
    }
    case "address":
    default: {
      return `${prefix}/address/${data}`;
    }
  }
}

// shorten the checksummed version of the input address to have 0x + 4 characters at start and end
export function shortenAddress(address: string, chars = 4): string {
  const parsed = isAddress(address);
  if (!parsed) {
    throw Error(`Invalid 'address' parameter '${address}'.`);
  }
  return `${parsed.substring(0, chars + 2)}...${parsed.substring(42 - chars)}`;
}

// account is not optional
export function getSigner(library: Web3Provider, account: string): JsonRpcSigner {
  return library.getSigner(account).connectUnchecked();
}

export function getProviderOrSigner(
  library: Web3Provider,
  account: string
): Web3Provider | JsonRpcSigner {
  if (!account) return library;
  return getSigner(library, account);
}

// account is optional
export function getContract(address: string, ABI: any, library: Web3Provider, account?: string): Contract {
  if (!isAddress(address) || address === AddressZero) {
    throw Error(`Invalid 'address' parameter '${address}'.`);
  }
  return new Contract(address, ABI, getProviderOrSigner(library, account) as any);
}

export default function getLibrary(provider: any): Web3Provider {
  const library = new Web3Provider(provider, "any");
  library.pollingInterval = 12000;
  return library;
}

export const tryAutoLogin = (activate) => {
  const { connector } = SUPPORTED_WALLETS["METAMASK"];
  // if the connector is walletconnect and the user has already tried to connect, manually reset the connector
  if (connector instanceof WalletConnectConnector && connector.walletConnectProvider?.wc?.uri) {
    connector.walletConnectProvider = undefined;
  }

  setTimeout(() => {
    activate(connector, undefined, true)
      .catch((error) => {
        if (error instanceof UnsupportedChainIdError) {
          activate(connector); // a little janky...can't use setError because the connector isn't set
        }
      })
      .then(() => {
        activate(connector);
      });
  });
};

export function isSafari(): boolean {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}
