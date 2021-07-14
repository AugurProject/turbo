import React, { useEffect, useState } from "react";
import { CheckCircle, XCircle } from "react-feather";
import CopyHelper from "./CopyHelper";
import { CHAIN_ID_NAMES, getChainExplorerLink, MATIC_CHAINS, shortenAddress } from "../../utils";
import { injected } from "../../connectors";
import { SUPPORTED_WALLETS } from "../../constants";
import { useActiveWeb3React } from "../../hooks";
import Styles from "./index.less";
import classNames from "classnames";
import { TinyThemeButton } from "../../../common/buttons";
import { Spinner } from "../../../common/spinner";
import { GetWalletIcon } from "../../../common/get-wallet-icon";
import { AbstractConnector } from "@web3-react/abstract-connector";
import { TX_STATUS } from "../../../../utils/constants";
import { LinkIcon, CloseIcon } from "../../../common/icons";
import { ChainId } from "@uniswap/sdk";
import { useUserStore } from '../../../../stores/user';
import { faucetUSDC } from "../../../../utils/contract-calls";

export interface AccountCardProps {
  account: string;
  connector: AbstractConnector;
  connectorName: string;
  chainId: ChainId;
  chainName: string;
}

const AccountCard = ({ account, connector, connectorName, chainId, chainName }: AccountCardProps) => {
  return (
    <div className={Styles.AccountCard}>
      <div>
        <span>{connectorName} on {chainName}</span>
        <span></span>
      </div>
      <div>
        <GetWalletIcon connector={connector} account={account} showPortisButton />
        <h3>{account && shortenAddress(account)}</h3>
      </div>
      <div>
        {account && <CopyHelper toCopy={account} copyText="Copy Address" />}
        {chainId && account && (
          <TinyThemeButton
            href={getChainExplorerLink(chainId, account, "address")}
            icon={LinkIcon}
            text={`View on ${MATIC_CHAINS.includes(chainId) ? 'PolygonScan' : 'Etherscan'}`}
          />
        )}
      </div>
    </div>
  );
};

const GetStatusIcon = (transactionStatus: string) => {
  if (transactionStatus === "PENDING") {
    return (
      <span>
        <Spinner />
      </span>
    );
  } else if (transactionStatus === "FAILURE") {
    return (
      <span className={Styles.Failure}>
        <XCircle size={16} />
      </span>
    );
  } else if (transactionStatus === "CONFIRMED") {
    return (
      <span className={Styles.Success}>
        <CheckCircle size={16} />
      </span>
    );
  } else {
    return null;
  }
};

const Transaction = ({ label, link, status, chainId, showClear, clear }: typeof React.Component) => (
  <div key={link}>
    <span>{label}</span>
    {link && (
      <a href={getChainExplorerLink(chainId, link, "transaction")} target="_blank" rel="noopener noreferrer">
        {LinkIcon}
      </a>
    )}
    {showClear && <span className={Styles.TransactionClear} onClick={() => clear()}>{CloseIcon}</span>}
    {!link && <div />}
    {GetStatusIcon(status)}
  </div>
);

const Transactions = ({ transactions, removeTransaction, chainId }) => {
  const [clear, setClear] = useState(false);
  const [userTransactions, setUserTransactions] = useState(transactions.sort((a, b) => b.timestamp - a.timestamp));

  useEffect(() => {
    const handleClear = () => {
      // Remove all transaction that aren't PENDING
      const transactionsToRemove = transactions
        .filter((tx) => [TX_STATUS.CONFIRMED, TX_STATUS.FAILURE].includes(tx.status))
        .map((tx) => tx.hash);

      setUserTransactions(
        userTransactions
          .filter((tx) => !transactionsToRemove.includes(tx.hash))
          .sort((a, b) => b.timestamp - a.timestamp)
      );
      if (transactionsToRemove) {
        transactionsToRemove.forEach((tx) => {
          removeTransaction(tx);
        });
        setClear(false);
      }
    };

    if (clear) {
      handleClear();
    }
  }, [removeTransaction, transactions, clear, setClear, userTransactions]);

  const canClear =
    userTransactions.filter((tx) => [TX_STATUS.CONFIRMED, TX_STATUS.FAILURE].includes(tx.status)).length > 0;

  const clearHash = (hash) => {
    const transactionToRemove = transactions
      .filter((tx) => tx.hash === hash)
      .map((tx) => tx.hash);

    setUserTransactions(
      userTransactions
        .filter((tx) => !transactionToRemove.includes(tx.hash))
        .sort((a, b) => b.timestamp - a.timestamp)
    );
    if (transactionToRemove) {
      transactionToRemove.forEach((tx) => {
        removeTransaction(tx);
      });
      setClear(false);
    }
  };

  return userTransactions.length === 0 ? (
    <span>Your Transactions will appear here</span>
  ) : (
    <div className={Styles.Transactions}>
      <div>
        <span>Recent Transactions</span>
        <span onClick={() => (canClear ? setClear(true) : null)}>{canClear && "Clear All"}</span>
      </div>
      <div className={Styles.TransactionList}>
        {userTransactions.map(({ message, hash, status }, index) => (
          <Transaction key={hash} label={message} link={hash} status={status} chainId={chainId} clear={() => clearHash(hash)} showClear={status === TX_STATUS.PENDING } />
        ))}
      </div>
    </div>
  );
};

const formatConnectorName = (connector) => {
  const ethereum = window["ethereum"];
  // @ts-ignore
  const isMetaMask = !!(ethereum && ethereum.isMetaMask);
  return (
    "Connected with " +
    Object.keys(SUPPORTED_WALLETS)
      .filter(
        (k) =>
          SUPPORTED_WALLETS[k].connector === connector && (connector !== injected || isMetaMask === (k === "METAMASK"))
      )
      .map((k) => SUPPORTED_WALLETS[k].name)[0]
  );
};

const formatChainName = (chainId) => {
  return CHAIN_ID_NAMES[chainId];
};


export interface AccountDetailsProps {
  openOptions: Function;
  darkMode: boolean;
  transactions: object[];
  removeTransaction: Function;
  logout: Function;
}

export const AccountDetails = ({
  openOptions,
  darkMode,
  transactions,
  removeTransaction,
  logout,
}: AccountDetailsProps) => {
  const { chainId, account, connector } = useActiveWeb3React();
  const [connectorName, setConnectorName] = useState(formatConnectorName(connector));
  const [chainName, setChainName] = useState(formatChainName(chainId));
  const { deactivate } = useActiveWeb3React();
  const { loginAccount } = useUserStore();
  const provider = loginAccount?.library ? loginAccount.library : null;

  useEffect(() => {
    setChainName(formatChainName(chainId));
  }, [account, chainId, transactions]);

  useEffect(() => {
    setChainName(formatChainName(chainId));
  }, [account, chainId, transactions]);

  useEffect(() => {
    setConnectorName(formatConnectorName(connector));
  }, [account, connector, transactions]);

  return (
    <div
      className={classNames(Styles.AccountDetails, {
        [Styles.DarkMode]: darkMode,
      })}
    >
      <section className={Styles.Content}>
        <AccountCard account={account} connector={connector} connectorName={connectorName} chainId={chainId} chainName={chainName} />
      </section>
      <section>
        {!process.env.HIDE_FAUCET && <TinyThemeButton action={() => faucetUSDC(provider, account)} text="Faucet 10k USDC" />}
        <TinyThemeButton action={() => openOptions()} text="Switch Wallet" />
        {connector !== injected && (connector as any)?.walletConnectProvider?.qrcode && (
          <TinyThemeButton action={() => (connector as any).walletConnectProvider?.disconnect()} text="Sign Out" />
        )}
      </section>
      <footer>
        <Transactions chainId={chainId} removeTransaction={removeTransaction} transactions={transactions} />
      </footer>
    </div>
  );
};
