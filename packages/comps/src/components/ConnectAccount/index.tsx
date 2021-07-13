import React, { ReactElement, useEffect, useState } from "react";
import { UnsupportedChainIdError, useWeb3React } from "@web3-react/core";
import { Activity as NetworkIcon } from "react-feather";
import { ethers } from "ethers";
import { SecondaryThemeButton } from "../common/buttons";
import ButtonStyles from "../common/buttons.styles.less";
import { GetWalletIcon } from "../common/get-wallet-icon";
import { useActiveWeb3React } from "./hooks";
import { MODAL_CONNECT_WALLET, MODAL_CONNECT_TO_POLYGON, TX_STATUS } from "../../utils/constants";
import { MATIC_MUMBAI, tryAutoLogin } from "./utils";
import { Spinner } from "../common/spinner";
import { MATIC_RPC_DATA, MATIC_MUMBAI_RPC_DATA } from "../ConnectAccount/constants/index";
import { PARA_CONFIG } from "../../stores/constants";

// @ts-ignore
const ethereum = window.ethereum;

export interface LoginButtonProps {
  action: Function;
  text: string;
  icon: ReactElement;
  darkMode: boolean;
  className: string;
  buttonOptions?: any;
}
const LoginButton = ({ action, text, icon, darkMode, className, buttonOptions }: LoginButtonProps) => (
  <SecondaryThemeButton
    action={action}
    text={text}
    icon={icon}
    ariaLabel={`account info button, account: ${text}`}
    customClass={className}
    {...{...buttonOptions}}
  />
);

const shortenAddress = (address: string, chars = 4): string => {
  const isAddress = (value) => {
    try {
      return ethers.utils.getAddress(value.toLowerCase());
    } catch {
      return false;
    }
  };
  const parsed = isAddress(address);
  if (!parsed) {
    throw Error(`Invalid 'address' parameter '${address}'.`);
  }
  return `${parsed.substring(0, chars + 2)}...${parsed.substring(42 - chars)}`;
};

const ConnectAccountButton = ({
  autoLogin,
  updateLoginAccount,
  darkMode = false,
  transactions,
  isMobile,
  setModal,
  buttonOptions = null,
  customClassForModal = null,
}) => {
  const networkId = PARA_CONFIG.networkId;
  const RPC_DATA = Number(networkId) === MATIC_MUMBAI ? MATIC_MUMBAI_RPC_DATA : MATIC_RPC_DATA;
  const { account, activate, connector, error } = useWeb3React();
  const activeWeb3 = useActiveWeb3React();
  const [initialLogin, setInitalLogin] = useState(false);
  const [isOnMatic, setIsOnMatic] = useState(true);
  const pendingTransaction = transactions.filter((tx) => tx.status === TX_STATUS.PENDING);
  const hasPendingTransaction = pendingTransaction.length > 0 || false;

  const maticCheck = () => {
    if (!ethereum || !ethereum.chainId) {
      return; // No injected MM to check
    }

    if (ethereum && ethereum?.chainId === RPC_DATA?.chainId) {
      setIsOnMatic(true);
    } else {
      setIsOnMatic(false);
    }
  };

  const connectToMatic = async () => {
    if (ethereum && ethereum?.chainId !== RPC_DATA?.chainId) {
      try {
        await ethereum.request({ method: "wallet_addEthereumChain", params: [RPC_DATA] });
        setIsOnMatic(true);
      } catch (error) {
        setModal({
          type: MODAL_CONNECT_TO_POLYGON,
          customClassForModal
        });
      }
    }
  };

  useEffect(() => {
    maticCheck();
    if (autoLogin && !account) {
      if (!initialLogin) {
        setInitalLogin(true);
        if (isOnMatic) {
          tryAutoLogin(activate);
        }
      }
    }
  }, [autoLogin, account, activate]);

  useEffect(() => {
    if (account) {
      updateLoginAccount(activeWeb3);
    }
  }, [account, activeWeb3.library, activeWeb3.connector, activeWeb3.chainId, activeWeb3.error, activeWeb3.active]);

  let buttonProps = {
    action: () =>
      setModal({
        type: MODAL_CONNECT_WALLET,
        darkMode,
        autoLogin,
        transactions,
        customClassForModal,
      }),
    className: null,
    darkMode,
    icon: null,
    text: "Connect Wallet",
    buttonOptions,
  };

  if (!isOnMatic) {
    buttonProps = {
      ...buttonProps,
      action: () => {
        maticCheck();
        setTimeout(() => {
          connectToMatic();
        });
      },
      text: "Connect to Polygon",
      icon: <NetworkIcon />,
    };
  } else if (account) {
    buttonProps = {
      ...buttonProps,
      className: hasPendingTransaction ? ButtonStyles.Pending : null,
      text: hasPendingTransaction
        ? `${pendingTransaction.length || 0} Pending`
        : isMobile
        ? shortenAddress(account, 3)
        : shortenAddress(account),
      // icon: hasPendingTransaction ? (
       icon: <Spinner />
      // ) : (
      //   connector && <GetWalletIcon connector={connector} account={account} />
      // ),
    };
  } else if (error) {
    buttonProps = {
      ...buttonProps,
      className: ButtonStyles.Error,
      text: error instanceof UnsupportedChainIdError ? "Unsupported Network" : "Error",
      icon: <NetworkIcon />,
    };
  }

  return <LoginButton {...buttonProps} />;
};

// export interface ConnectAccountProps {
//   customClassForModal: object | null;

// }

export const ConnectAccount = ({
  customClassForModal = null,
  autoLogin,
  updateLoginAccount,
  darkMode = false,
  transactions,
  isMobile,
  setModal,
  buttonOptions = null,
}) => (
  <ConnectAccountButton
    autoLogin={autoLogin}
    updateLoginAccount={updateLoginAccount}
    darkMode={darkMode}
    transactions={transactions}
    isMobile={isMobile}
    setModal={setModal}
    buttonOptions={buttonOptions}
    customClassForModal={customClassForModal}
  />
);
