// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import Styles from "./tables.styles.less";
import classNames from "classnames";
import {
  AmmExchange,
  AmmTransaction,
  LPTokenBalance,
  MarketInfo,
  PositionBalance,
  SimpleBalance,
  Winnings,
} from "../types";
import {
  useAppStatusStore,
  useDataStore,
  useUserStore,
  useCanExitCashPosition,
  Constants,
  DateUtils,
  Formatter,
  ContractCalls,
  Components,
} from "@augurproject/comps";
import getUSDC from "../../utils/get-usdc";
const {
  LabelComps: { MovementLabel, generateTooltip, WarningBanner },
  PaginationComps: { sliceByPage, Pagination },
  ButtonComps: { PrimaryButton, SecondaryButton, TinyButton },
  SelectionComps: { SmallDropdown },
  Links: { AddressLink, MarketLink, ReceiptLink },
  Icons: { EthIcon, UpArrow, UsdIcon },
} = Components;
const { claimWinnings, getUserLpTokenInitialAmount } = ContractCalls;
const { formatLpTokens, formatDai, formatCash, formatSimplePrice, formatSimpleShares, formatPercent } = Formatter;
const { timeSinceTimestamp } = DateUtils;
const {
  MODAL_ADD_LIQUIDITY,
  USDC,
  POSITIONS,
  LIQUIDITY,
  ALL,
  ADD,
  REMOVE,
  TRADES,
  TX_STATUS,
  ETH,
  TABLES,
  TransactionTypes,
} = Constants;

interface PositionsTableProps {
  market: MarketInfo;
  ammExchange: AmmExchange;
  positions: PositionBalance[];
  claimableWinnings?: Winnings;
  singleMarket?: boolean;
}

interface LiquidityTableProps {
  market: MarketInfo;
  ammExchange: AmmExchange;
  lpTokens?: SimpleBalance;
  singleMarket?: boolean;
}

const MarketTableHeader = ({
  market: { title, description, marketId },
  ammExchange,
}: {
  market: MarketInfo;
  ammExchange: AmmExchange;
}) => (
  <div className={Styles.MarketTableHeader}>
    <MarketLink id={marketId}>
      <span className={Styles.MarketTitle}>
        {!!title && <span>{title}</span>}
        {!!description && <span>{description}</span>}
      </span>
      {ammExchange.cash.name === USDC ? UsdIcon : EthIcon}
    </MarketLink>
  </div>
);

const PositionHeader = () => {
  const { isMobile } = useAppStatusStore();
  return (
    <ul className={Styles.PositionHeader}>
      <li>outcome</li>
      <li>
        {isMobile ? (
          <>
            qty
            <br />
            owned
          </>
        ) : (
          "quantity owned"
        )}
      </li>
      <li>
        {isMobile ? (
          <>
            avg.
            <br />
            price
          </>
        ) : (
          "avg. price paid"
        )}
      </li>
      <li>init. value</li>
      <li>cur.{isMobile ? <br /> : " "}value</li>
      <li>
        p/l{" "}
        {generateTooltip(
          "Display values might be rounded. Dashes are displayed when liquidity is depleted.",
          "pnltip-positionheader"
        )}
      </li>
    </ul>
  );
};

const PositionRow = ({ position, hasLiquidity = true }: { position: PositionBalance; hasLiquidity: boolean }) => (
  <ul className={Styles.PositionRow}>
    <li>{position.outcomeName}</li>
    <li>{formatSimpleShares(position.quantity).formattedValue}</li>
    <li>{formatSimplePrice(position.avgPrice).full}</li>
    <li>{formatDai(position.initCostUsd).full}</li>
    <li>{hasLiquidity ? formatDai(position.usdValue).full : "-"}</li>
    <li>
      {hasLiquidity ? (
        <MovementLabel value={formatDai(position.totalChangeUsd)} numberValue={parseFloat(position.totalChangeUsd)} />
      ) : (
        "-"
      )}
    </li>
  </ul>
);

interface PositionFooterProps {
  claimableWinnings?: Winnings;
  market: MarketInfo;
  showTradeButton?: boolean;
}
export const PositionFooter = ({
  claimableWinnings,
  market: { settlementFee, marketId, amm, marketFactoryAddress, turboId },
  showTradeButton,
}: PositionFooterProps) => {
  const { cashes } = useDataStore();
  const { isMobile } = useAppStatusStore();
  const {
    account,
    loginAccount,
    actions: { addTransaction },
  } = useUserStore();
  const [pendingClaim, setPendingClaim] = useState(false);
  const ammCash = getUSDC(cashes);
  const canClaimETH = useCanExitCashPosition({
    name: ammCash?.name,
    shareToken: ammCash?.sharetoken,
  });
  const isETHClaim = ammCash?.name === ETH;

  const claim = async () => {
    if (amm && account) {
      if (canClaimETH || !isETHClaim) {
        setPendingClaim(true);
        claimWinnings(account, loginAccount?.library, [turboId], [marketFactoryAddress])
          .then((response) => {
            // handle transaction response here
            setPendingClaim(false);
            if (response) {
              const { hash } = response;
              addTransaction({
                hash,
                chainId: loginAccount?.chainId,
                seen: false,
                status: TX_STATUS.PENDING,
                from: account,
                addedTime: new Date().getTime(),
                message: `Claim Winnings`,
                marketDescription: amm?.market?.description,
              });
            }
          })
          .catch((error) => {
            setPendingClaim(false);
            console.log("Error when trying to claim winnings: ", error?.message);
          });
      }
    }
  };

  if ((isMobile && !claimableWinnings) || (!claimableWinnings && !showTradeButton)) return null;

  return (
    <div className={Styles.PositionFooter}>
      {claimableWinnings && (
        <>
          <span>{`${formatPercent(settlementFee).full} fee charged on settlement`}</span>
          <PrimaryButton
            text={
              !pendingClaim
                ? `${isETHClaim && !canClaimETH ? "Approve to " : ""}Claim Winnings (${
                    formatCash(claimableWinnings?.claimableBalance, amm?.cash?.name).full
                  })`
                : `Waiting for Confirmation`
            }
            subText={pendingClaim && `(Confirm this transaction in your wallet)`}
            action={claim}
            disabled={pendingClaim}
          />
        </>
      )}
      {!isMobile && showTradeButton && (
        <MarketLink id={marketId} ammId={amm?.id}>
          <SecondaryButton text="trade" />
        </MarketLink>
      )}
    </div>
  );
};

export const AllPositionTable = ({ page, claimableFirst = false }) => {
  const {
    balances: { marketShares },
  } = useUserStore();
  const positions = marketShares
    ? ((Object.values(marketShares) as unknown[]) as {
        ammExchange: AmmExchange;
        positions: PositionBalance[];
        claimableWinnings: Winnings;
      }[])
    : [];
  if (claimableFirst) {
    positions.sort((a, b) => (a?.claimableWinnings?.claimableBalance ? -1 : 1));
  }
  const positionVis = sliceByPage(positions, page, POSITIONS_LIQUIDITY_LIMIT).map((position) => {
    return (
      <PositionTable
        key={`${position.ammExchange.marketId}-PositionsTable`}
        market={position.ammExchange.market}
        ammExchange={position.ammExchange}
        positions={position.positions}
        claimableWinnings={position.claimableWinnings}
      />
    );
  });

  return <>{positionVis}</>;
};

export const PositionTable = ({
  market,
  ammExchange,
  positions,
  claimableWinnings,
  singleMarket,
}: PositionsTableProps) => {
  const {
    seenPositionWarnings,
    actions: { updateSeenPositionWarning },
  } = useUserStore();
  const marketAmmId = market?.marketId;
  const seenMarketPositionWarningAdd = seenPositionWarnings && seenPositionWarnings[marketAmmId]?.add;
  const seenMarketPositionWarningRemove = seenPositionWarnings && seenPositionWarnings[marketAmmId]?.remove;
  const { hasLiquidity } = ammExchange;
  return (
    <>
      <div className={Styles.PositionTable}>
        {!singleMarket && <MarketTableHeader market={market} ammExchange={ammExchange} />}
        <PositionHeader />
        {positions.length === 0 && <span>No positions to show</span>}
        {positions &&
          positions
            .filter((p) => p.visible)
            .map((position, id) => <PositionRow key={id} position={position} hasLiquidity={hasLiquidity} />)}
        <PositionFooter showTradeButton={!singleMarket} market={market} claimableWinnings={claimableWinnings} />
      </div>
      {!seenMarketPositionWarningAdd &&
        singleMarket &&
        positions.filter((position) => position.positionFromLiquidity).length > 0 && (
          <WarningBanner
            className={Styles.MarginTop}
            title="Why do I have a position after adding liquidity?"
            subtitle={
              "To maintain the Yes to No percentage ratio, a number of shares are returned to the liquidity provider."
            }
            onClose={() => updateSeenPositionWarning(marketAmmId, true, ADD)}
          />
        )}
      {!seenMarketPositionWarningRemove &&
        singleMarket &&
        positions.filter((position) => position.positionFromRemoveLiquidity).length > 0 && (
          <WarningBanner
            className={Styles.MarginTop}
            title="Why do I have a position after removing liquidity?"
            subtitle={`To give liquidity providers the most options available to manage their positions. Shares can be sold for ${market?.amm?.cash?.name}.`}
            onClose={() => updateSeenPositionWarning(marketAmmId, true, REMOVE)}
          />
        )}
    </>
  );
};

const LiquidityHeader = () => (
  <ul className={Styles.LiquidityHeader}>
    <li>LP tokens owned</li>
    <li>init. value</li>
    <li>cur. value</li>
  </ul>
);

const LiquidityRow = ({ liquidity, initCostUsd }: { liquidity: LPTokenBalance; initCostUsd: string }) => {
  return (
    <ul className={Styles.LiquidityRow}>
      <li>{formatLpTokens(liquidity.balance).formatted}</li>
      <li>{formatDai(initCostUsd).full}</li>
      <li>{formatDai(liquidity.usdValue).full}</li>
    </ul>
  );
};

export const LiquidityFooter = ({ market }: { market: MarketInfo }) => {
  const {
    actions: { setModal },
  } = useAppStatusStore();
  return (
    <div className={Styles.LiquidityFooter}>
      <PrimaryButton
        text="remove liquidity"
        action={() =>
          setModal({
            type: MODAL_ADD_LIQUIDITY,
            market,
            currency: market?.amm?.cash?.name,
            liquidityModalType: REMOVE,
          })
        }
      />
      <SecondaryButton
        text="add liquidity"
        action={() =>
          setModal({
            type: MODAL_ADD_LIQUIDITY,
            market,
            currency: market?.amm?.cash?.name,
            liquidityModalType: ADD,
          })
        }
      />
    </div>
  );
};

export const AllLiquidityTable = ({ page }) => {
  const {
    balances: { lpTokens },
  } = useUserStore();
  const { ammExchanges, markets } = useDataStore();
  const liquidities = lpTokens
    ? Object.keys(lpTokens).map((ammId) => ({
        ammExchange: ammExchanges[ammId],
        market: markets[ammId],
        lpTokens: lpTokens[ammId],
      }))
    : [];
  const liquiditiesViz = sliceByPage(liquidities, page, POSITIONS_LIQUIDITY_LIMIT).map((liquidity) => {
    return (
      <LiquidityTable
        key={`${liquidity.market.marketId}-liquidityTable`}
        market={liquidity.market}
        ammExchange={liquidity.ammExchange}
        lpTokens={liquidity.lpTokens}
      />
    );
  });

  return <>{liquiditiesViz}</>;
};

export const LiquidityTable = ({ market, singleMarket, ammExchange, lpTokens }: LiquidityTableProps) => {
  const {
    isLogged,
    actions: { setModal },
  } = useAppStatusStore();
  const { account } = useUserStore();
  const { transactions } = useDataStore();
  const lpAmounts = getUserLpTokenInitialAmount(transactions, account, ammExchange.cash);
  const initCostUsd = lpAmounts[market?.marketId.toLowerCase()];
  return (
    <div className={Styles.LiquidityTable}>
      {!singleMarket && <MarketTableHeader market={market} ammExchange={ammExchange} />}
      <LiquidityHeader />
      {!lpTokens && (
        <span>
          No liquidity to show
          <PrimaryButton
            action={() => {
              if (isLogged) {
                setModal({
                  type: MODAL_ADD_LIQUIDITY,
                  market,
                  liquidityModalType: ADD,
                  currency: ammExchange?.cash?.name,
                });
              }
            }}
            disabled={!isLogged}
            text="Earn fees as a liquidity provider"
          />
        </span>
      )}
      {lpTokens && <LiquidityRow liquidity={lpTokens} initCostUsd={initCostUsd} />}
      {lpTokens && <LiquidityFooter market={market} />}
    </div>
  );
};

interface PositionsLiquidityViewSwitcherProps {
  ammExchange?: AmmExchange;
  showActivityButton?: boolean;
  setActivity?: Function;
  setTables?: Function;
  view?: string;
  claimableFirst?: boolean;
}

const POSITIONS_LIQUIDITY_LIMIT = 5;

export const PositionsLiquidityViewSwitcher = ({
  ammExchange,
  showActivityButton,
  setActivity,
  setTables,
  view,
  claimableFirst = false,
}: PositionsLiquidityViewSwitcherProps) => {
  const [page, setPage] = useState(1);
  const {
    balances: { lpTokens, marketShares },
  } = useUserStore();
  const { ammExchanges, markets } = useDataStore();
  const marketId = ammExchange?.marketId;

  let userPositions = [];
  let liquidity = null;
  let winnings = null;
  if (marketId && marketShares) {
    userPositions = marketShares[marketId] ? marketShares[marketId].positions : [];
    liquidity = lpTokens[marketId] ? lpTokens[marketId] : null;
    winnings = marketShares[marketId] ? marketShares[marketId]?.claimableWinnings : null;
  }
  const market = ammExchange?.market;

  const positions = marketShares
    ? ((Object.values(marketShares) as unknown[]) as {
        ammExchange: AmmExchange;
        positions: PositionBalance[];
        claimableWinnings: Winnings;
      }[])
    : [];
  const liquidities = lpTokens
    ? Object.keys(lpTokens).map((marketId) => ({
        ammExchange: ammExchanges[marketId],
        market: markets[marketId],
        lpTokens: lpTokens[marketId],
      }))
    : [];

  const [tableView, setTableView] = useState(positions.length === 0 && liquidities.length > 0 ? LIQUIDITY : POSITIONS);
  useEffect(() => {
    if (view === TABLES && tableView === null) {
      setTableView(POSITIONS);
    }
  }, [view]);
  return (
    <div className={Styles.PositionsLiquidityViewSwitcher}>
      <div>
        <span
          onClick={() => {
            setTables && setTables();
            setTableView(POSITIONS);
          }}
          className={classNames({
            [Styles.Selected]: tableView === POSITIONS,
          })}
        >
          {POSITIONS}
        </span>
        <span
          onClick={() => {
            setTables && setTables();
            setTableView(LIQUIDITY);
          }}
          className={classNames({
            [Styles.Selected]: tableView === LIQUIDITY,
          })}
        >
          {LIQUIDITY}
        </span>
        {showActivityButton && (
          <TinyButton
            action={() => {
              setTableView(null);
              setActivity();
            }}
            text="your activity"
            selected={tableView === null}
          />
        )}
      </div>
      {tableView !== null && (
        <div>
          {!marketId && (positions.length > 0 || liquidities.length > 0) && (
            <>
              {tableView === POSITIONS && <AllPositionTable page={page} claimableFirst={claimableFirst} />}
              {tableView === LIQUIDITY && <AllLiquidityTable page={page} />}
            </>
          )}
          {!marketId &&
            ((positions.length > 0 && tableView === POSITIONS) ||
              (liquidities.length > 0 && tableView === LIQUIDITY)) && (
              <Pagination
                page={page}
                itemCount={tableView === POSITIONS ? positions.length : liquidities.length}
                itemsPerPage={POSITIONS_LIQUIDITY_LIMIT}
                action={(page) => setPage(page)}
                updateLimit={() => null}
              />
            )}
          {marketId && (
            <>
              {tableView === POSITIONS && (
                <PositionTable
                  singleMarket
                  market={market}
                  ammExchange={ammExchange}
                  positions={userPositions}
                  claimableWinnings={winnings}
                />
              )}
              {tableView === LIQUIDITY && (
                <LiquidityTable singleMarket market={market} ammExchange={ammExchange} lpTokens={liquidity} />
              )}
            </>
          )}
        </div>
      )}
      {positions?.length === 0 && !marketId && tableView === POSITIONS && <span>No positions to show</span>}
      {liquidities?.length === 0 && !marketId && tableView === LIQUIDITY && <span>No liquidity to show</span>}
    </div>
  );
};

const TransactionsHeader = ({ selectedType, setSelectedType, sortUp, setSortUp }) => {
  const { isMobile } = useAppStatusStore();
  return (
    <ul className={Styles.TransactionsHeader}>
      <li>
        {isMobile ? (
          <SmallDropdown
            onChange={(value) => setSelectedType(value)}
            options={[
              { label: ALL, value: ALL },
              { label: TRADES, value: TRADES },
              { label: ADD, value: ADD },
              { label: REMOVE, value: REMOVE },
            ]}
            defaultValue={ALL}
          />
        ) : (
          <>
            <span
              className={classNames({
                [Styles.Selected]: selectedType === ALL,
              })}
              onClick={() => setSelectedType(ALL)}
            >
              all
            </span>
            <span
              className={classNames({
                [Styles.Selected]: selectedType === TRADES,
              })}
              onClick={() => setSelectedType(TRADES)}
            >
              trades
            </span>
            <span
              className={classNames({
                [Styles.Selected]: selectedType === ADD,
              })}
              onClick={() => setSelectedType(ADD)}
            >
              adds
            </span>
            <span
              className={classNames({
                [Styles.Selected]: selectedType === REMOVE,
              })}
              onClick={() => setSelectedType(REMOVE)}
            >
              removes
            </span>
          </>
        )}
      </li>
      <li>total value</li>
      {/* <li>token amount</li> */}
      <li>share amount</li>
      <li>account</li>
      <li className={classNames({ [Styles.SortUp]: sortUp })} onClick={() => setSortUp()}>
        time {UpArrow}
      </li>
    </ul>
  );
};

interface TransactionProps {
  transaction: AmmTransaction;
}

const TX_PAGE_LIMIT = 10;

const TransactionRow = ({ transaction }: TransactionProps) => (
  <ul className={Styles.TransactionRow} key={transaction.id}>
    <li>
      <ReceiptLink hash={transaction.txHash} label={transaction?.subheader} />
    </li>
    <li>{transaction.displayCollateral.full}</li>
    <li>{transaction.displayShares ? transaction.displayShares : 0}</li>
    <li>
      <AddressLink account={transaction.sender} short />
    </li>
    <li>
      {timeSinceTimestamp(transaction.timestamp)}
    </li>
  </ul>
);

interface TransactionsProps {
  transactions: AmmTransaction[];
}

export const TransactionsTable = ({ transactions }: TransactionsProps) => {
  const [selectedType, setSelectedType] = useState(ALL);
  const [page, setPage] = useState(1);
  const [sortUp, setSortUp] = useState(false);
  const filteredTransactions = useMemo(
    () =>
      []
        .concat(transactions)
        .filter(({ tx_type }) => {
          switch (selectedType) {
            case TRADES: {
              return tx_type === TransactionTypes.ENTER || tx_type === TransactionTypes.EXIT;
            }
            case ADD: {
              return tx_type === TransactionTypes.ADD_LIQUIDITY;
            }
            case REMOVE: {
              return tx_type === TransactionTypes.REMOVE_LIQUIDITY;
            }
            case ALL:
            default:
              return true;
          }
        })
        .sort((a, b) => (!sortUp ? b.timestamp - a.timestamp : a.timestamp - b.timestamp)),
    [selectedType, transactions, sortUp]
  );
  return (
    <div className={Styles.TransactionsTable}>
      <TransactionsHeader
        selectedType={selectedType}
        setSelectedType={(type) => {
          setPage(1);
          setSelectedType(type);
        }}
        sortUp={sortUp}
        setSortUp={() => setSortUp(!sortUp)}
      />
      {sliceByPage(filteredTransactions, page, TX_PAGE_LIMIT).map((transaction) => (
        <TransactionRow key={transaction.id} transaction={transaction} />
      ))}
      {filteredTransactions.length > 0 && (
        <div className={Styles.PaginationFooter}>
          <Pagination
            page={page}
            itemCount={filteredTransactions.length}
            itemsPerPage={TX_PAGE_LIMIT}
            action={(page) => setPage(page)}
            updateLimit={() => null}
          />
        </div>
      )}
      {filteredTransactions.length === 0 && <span>No transactions to show</span>}
    </div>
  );
};
