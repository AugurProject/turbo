import { AbstractConnector } from "@web3-react/abstract-connector";
// import { fortmatic, injected, portis, walletconnect, walletlink } from "../connectors";
import { injected, walletconnect } from '../connectors';

export interface WalletInfo {
  connector?: AbstractConnector;
  name: string;
  iconName: string;
  description: string;
  href: string | null;
  color: string;
  primary?: true;
  mobile?: boolean;
  mobileOnly?: true;
}

export const MATIC_MUMBAI_RPCS = ['https://rpc-mumbai.maticvigil.com/', 'https://matic-mumbai.chainstacklabs.com', 'https://matic-testnet-archive-rpc.bwarelabs.com'];
export const MATIC_MUMBAI_BLOCK_EXPLORERS = ['https://explorer-mumbai.maticvigil.com', 'https://mumbai-explorer.matic.today', 'https://backup-mumbai-explorer.matic.today'];
export const MATIC_RPC_DATA = [{
  chainId: '0x13881',
  chainName: 'Mumbai-Testnet',
  nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
  },
  rpcUrls: MATIC_MUMBAI_RPCS,
  blockExplorerUrls: MATIC_MUMBAI_BLOCK_EXPLORERS,
}];

export const SUPPORTED_WALLETS: { [key: string]: WalletInfo } = {
  INJECTED: {
    connector: injected,
    name: "Mobile Web3 provider",
    iconName: "metamask.png",
    description: "Injected web3 provider.",
    href: null,
    color: "#010101",
    primary: true,
    mobile: true,
    mobileOnly: true,
  },
  METAMASK: {
    connector: injected,
    name: "MetaMask",
    iconName: "metamask.png",
    description: "Easy-to-use browser extension.",
    href: null,
    color: "#E8831D",
  },
  WALLET_CONNECT: {
    connector: walletconnect,
    name: "WalletConnect",
    iconName: "walletConnectIcon.svg",
    description: "Connect to Trust Wallet, Rainbow Wallet and more...",
    href: null,
    color: "#4196FC",
    mobile: true,
  },
  // WALLET_LINK: {
  //   connector: walletlink,
  //   name: "Coinbase Wallet",
  //   iconName: "coinbaseWalletIcon.svg",
  //   description: "Use Coinbase Wallet app on mobile device",
  //   href: null,
  //   color: "#315CF5",
  // },
  // FORTMATIC: {
  //   connector: fortmatic,
  //   name: "Fortmatic",
  //   iconName: "fortmaticIcon.png",
  //   description: "Login using Fortmatic hosted wallet",
  //   href: null,
  //   color: "#6748FF",
  //   mobile: true,
  // },
  // PORTIS: {
  //   connector: portis,
  //   name: "Portis",
  //   iconName: "portisIcon.png",
  //   description: "Login using Portis hosted wallet",
  //   href: null,
  //   color: "#4A6C9B",
  //   mobile: true,
  // },
};
