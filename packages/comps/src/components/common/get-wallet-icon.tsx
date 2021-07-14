import React from 'react';
import { injected, walletconnect } from '../ConnectAccount/connectors';
import Identicon from '../ConnectAccount/components/Identicon';
import WalletConnectIcon from '../ConnectAccount/assets/walletConnectIcon.svg';
import Styles from './get-wallet-icon.styles.less';
import {AbstractConnector} from '@web3-react/abstract-connector';

export interface GetWalletIconProps {
  account: string;
  connector: AbstractConnector;
  showPortisButton?: boolean;
};

export const GetWalletIcon = ({connector, account, showPortisButton = false }: GetWalletIconProps) => {
  let icon;
  let iconAlt;

  switch (connector) {
    case injected:
      icon = <Identicon account={account} />;
      iconAlt = 'Identicon Image';
      break;
    case walletconnect:
      icon = WalletConnectIcon;
      iconAlt = 'Wallet Connect Logo';
      break;
    default:
      return null;
  }

  return (
    <div className={Styles.WalletIcon}>
      {connector === injected ? icon : <img src={icon} alt={iconAlt} />}
    </div>
  );
}
