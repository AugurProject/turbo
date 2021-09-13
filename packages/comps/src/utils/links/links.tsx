import React from "react";
import { Link } from "react-router-dom";
import makePath from "./make-path";
import makeQuery from "./make-query";
import { MARKET, MARKETS, MARKET_ID_PARAM_NAME } from "../constants";
import { PARA_CONFIG } from "../../stores/constants";
import { LinkIcon } from "../../components/common/icons";
import { useActiveWeb3React } from "../../components/ConnectAccount/hooks";
import { getChainExplorerLink, MATIC_MAINNET } from "../../components/ConnectAccount/utils";

interface MarketLinkProps {
  id: string;
  ammId?: string;
  children?: any;
  dontGoToMarket?: boolean;
}

const RECEIPT_LINKS = {
  42: "https://kovan.etherscan.io/tx/",
  1: "https://etherscan.io/tx/",
  80001: "https://explorer-mumbai.maticvigil.com/tx/",
  137: "https://explorer-mainnet.maticvigil.com/tx/",
};

const ADDRESS_LINKS = {
  42: "https://kovan.etherscan.io/address/",
  1: "https://etherscan.io/address/",
  80001: "https://explorer-mumbai.maticvigil.com/address",
  137: "https://explorer-mainnet.maticvigil.com/address",
};

export const MarketsLink = ({ children, id }: MarketLinkProps) => (
  <Link
    data-testid={`marketsLink-${id}`}
    to={{
      pathname: makePath(MARKETS),
    }}
  >
    {children}
  </Link>
);
export const createMarketAmmId = (id) => {
  return `${id}`;
};

export const MarketLink = ({ id, dontGoToMarket, children }: MarketLinkProps) => {
  const idString = createMarketAmmId(id);
  return (
    <>
      {!dontGoToMarket ? (
        <Link
          data-testid={`link-${idString}`}
          to={
            !dontGoToMarket
              ? {
                  pathname: makePath(MARKET),
                  search: makeQuery({
                    [MARKET_ID_PARAM_NAME]: idString,
                  }),
                }
              : null
          }
        >
          {children}
        </Link>
      ) : (
        <section>{children}</section>
      )}
    </>
  );
};

interface ExternalLinkProps {
  URL: string;
  label: string;
  icon?: boolean;
}

export const ExternalLink = ({ URL, label, icon = false }: ExternalLinkProps) => (
  <a key={`${URL}-${label}`} href={URL} target="_blank" rel="noopener noreferrer">
    {icon && LinkIcon} {label}
  </a>
);

interface ReceiptLinkProps {
  hash: string;
  label?: string;
  icon?: boolean;
}

export const ReceiptLink = ({ hash, label = "View Txn", icon = false }: ReceiptLinkProps) => {
  const URL = `${RECEIPT_LINKS[PARA_CONFIG.networkId] || RECEIPT_LINKS[1]}${hash}`;
  return <ExternalLink {...{ URL, label, icon }} />;
};

interface AccountLinkProps {
  account: string;
  short?: boolean;
}

export const AddressLink = ({ account, short = false }: AccountLinkProps) => {
  const { chainId } = useActiveWeb3React();
  const label = short ? `${account.slice(0, 6)}...${account.slice(38, 42)}` : account;
  const URL = getChainExplorerLink(chainId || MATIC_MAINNET, account, "address");
  return <ExternalLink {...{ URL, label }} />;
};
