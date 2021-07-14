import { Web3Provider } from "@ethersproject/providers";
import { InjectedConnector } from "@web3-react/injected-connector";
import { WalletConnectConnector } from "@web3-react/walletconnect-connector";
import { NetworkConnector } from "./NetworkConnector";
import { ChainId } from "@uniswap/sdk";
import { PARA_CONFIG } from "../../../stores/constants";

const networkId = PARA_CONFIG.networkId;

export const NETWORK_CHAIN_ID: number = networkId ? parseInt(networkId) : ChainId.KOVAN;

const NETWORK_URL =
  NETWORK_CHAIN_ID === ChainId.MAINNET
    ? "https://eth-mainnet.alchemyapi.io/v2/Kd37_uEmJGwU6pYq6jrXaJXXi8u9IoOM"
    : "https://eth-kovan.alchemyapi.io/v2/Kd37_uEmJGwU6pYq6jrXaJXXi8u9IoOM";

if (typeof NETWORK_URL === "undefined") {
  throw new Error(`REACT_APP_NETWORK_URL must be a defined environment variable`);
}

export const network = new NetworkConnector({
  urls: { [NETWORK_CHAIN_ID]: NETWORK_URL },
});

let networkLibrary: Web3Provider | undefined;
export function getNetworkLibrary(): Web3Provider {
  return (networkLibrary = networkLibrary ?? new Web3Provider(network.provider as any));
}

export const injected = new InjectedConnector({
  supportedChainIds: [1, 3, 4, 5, 42, 137, 80001],
});

// mainnet only
export const walletconnect = new WalletConnectConnector({
  rpc: { [NETWORK_CHAIN_ID]: NETWORK_URL },

  bridge: "https://bridge.walletconnect.org",
  qrcode: true,
  pollingInterval: 15000,
});
