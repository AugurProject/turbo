import React, { useEffect, useMemo, useState } from "react";
import Styles from "./tables.styles.less";
import classNames from "classnames";
import { getClaimAllMessage } from "../portfolio/portfolio-view";
import {
  useAppStatusStore,
  useDataStore,
  useUserStore,
  Constants,
  DateUtils,
  Formatter,
  ContractCalls,
  Components,
} from "@augurproject/comps";
import {
  AmmExchange,
  AmmTransaction,
  MarketInfo,
  PositionBalance,
  Winnings,
  UserState,
  FormattedNumber,
  RewardsInfo,
  PendingUserReward,
} from "@augurproject/comps/build/types";
import getUSDC from "../../utils/get-usdc";
import { useSimplifiedStore } from "../stores/simplified";
const {
  LabelComps: { MovementLabel, generateTooltip, WarningBanner, ReportingStateLabel },
  PaginationComps: { sliceByPage, Pagination, useQueryPagination },
  ButtonComps: { PrimaryThemeButton, SecondaryThemeButton, TinyThemeButton },
  SelectionComps: { SmallDropdown },
  Links: { AddressLink, MarketLink, ReceiptLink },
  Icons: { EthIcon, UpArrow, UsdIcon, MaticIcon },
} = Components;
const { claimWinnings, getCompleteSetsAmount, cashOutAllShares } = ContractCalls;
const { formatDai, formatCash, formatSimplePrice, formatSimpleShares, formatPercent, formatToken } = Formatter;
const { timeSinceTimestamp, getMarketEndtimeFull, timeTogo, getMarketEndtimeDate } = DateUtils;
const { USDC, POSITIONS, LIQUIDITY, ALL, ADD, REMOVE, TRADES, TX_STATUS, TransactionTypes, MARKET_STATUS } = Constants;

interface PositionsTableProps {
  key?: string;
  market: MarketInfo;
  ammExchange: AmmExchange;
  positions: PositionBalance[];
  claimableWinnings?: Winnings;
  singleMarket?: boolean;
}

const MarketTableHeader = ({
  timeFormat,
  market: { startTimestamp, title, description, marketId, reportingState },
  ammExchange,
}: {
  timeFormat: string;
  market: MarketInfo;
  ammExchange: AmmExchange;
}) => (
  <div className={Styles.MarketTableHeader}>
    <MarketLink id={marketId}>
      <span className={Styles.MarketTitle}>
        {!!title && <span>{title}</span>}
        {!!description && <span>{description}</span>}
      </span>
      {reportingState !== MARKET_STATUS.TRADING && <ReportingStateLabel {...{ reportingState }} />}
      {ammExchange.cash.name === USDC ? UsdIcon : EthIcon}
    </MarketLink>
    {!!startTimestamp && <div>{getMarketEndtimeFull(startTimestamp, timeFormat)}</div>}
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

const PositionRow = ({
  position,
  hasLiquidity = true,
}: {
  position: PositionBalance;
  hasLiquidity: boolean;
  key?: string;
}) => (
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

const AWAITING_CONFIRM = "Waiting for Confirmation";
const AWAITING_CONFIRM_SUBTEXT = "(Confirm this transaction in your wallet)";
export const PositionFooter = ({
  claimableWinnings,
  market: { settlementFee, marketId, amm, marketFactoryAddress, turboId, title, description },
  showTradeButton,
}: PositionFooterProps) => {
  const { cashes } = useDataStore();
  const {
    account,
    loginAccount,
    actions: { addTransaction },
    balances,
    transactions,
  } = useUserStore();
  const [pendingCashOut, setPendingCashOut] = useState(false);
  const [pendingClaim, setPendingClaim] = useState(false);
  const [pendingCashOutHash, setPendingCashOutHash] = useState(null);
  const [pendingClaimHash, setPendingClaimHash] = useState(null);
  const ammCash = getUSDC(cashes);

  const hasWinner = amm?.market?.hasWinner;
  const disableClaim =
    pendingClaim ||
    Boolean(
      transactions.find(
        (t) =>
          t.status === TX_STATUS.PENDING && (t.hash === pendingClaimHash || t.message === getClaimAllMessage(ammCash))
      )
    );
  const disableCashOut =
    pendingCashOut ||
    (pendingCashOutHash &&
      Boolean(transactions.find((t) => t.hash === pendingCashOutHash && t.status === TX_STATUS.PENDING)));

  useEffect(() => {
    if (!disableClaim && pendingClaimHash) {
      setPendingClaimHash(null);
    }

    if (!disableCashOut && pendingCashOutHash) {
      setPendingCashOutHash(null);
    }
  }, [pendingCashOutHash, pendingClaimHash, disableClaim, disableCashOut, transactions]);

  const claim = async () => {
    if (amm && account) {
      setPendingClaim(true);
      claimWinnings(account, loginAccount?.library, [String(turboId)], marketFactoryAddress)
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
              marketDescription: `${title} ${description}`,
            });
            setPendingClaimHash(hash);
          }
        })
        .catch((error) => {
          setPendingClaim(false);
          console.error("Error when trying to claim winnings: ", error?.message);
          addTransaction({
            hash: `claim-failed${Date.now()}`,
            chainId: loginAccount?.chainId,
            seen: false,
            status: TX_STATUS.FAILURE,
            from: account,
            addedTime: new Date().getTime(),
            message: `Claim Winnings`,
            marketDescription: `${title} ${description}`,
          });
        });
    }
  };

  const cashOut = async () => {
    setPendingCashOut(true);
    cashOutAllShares(
      account,
      loginAccount?.library,
      balances?.marketShares[marketId]?.outcomeSharesRaw,
      String(turboId),
      amm?.shareFactor,
      amm?.marketFactoryAddress
    )
      .then((res) => {
        setPendingCashOut(false);
        if (res) {
          const { hash } = res;
          addTransaction({
            hash,
            chainId: loginAccount?.chainId,
            seen: false,
            status: TX_STATUS.PENDING,
            from: account,
            addedTime: new Date().getTime(),
            message: `Cashed Out Shares`,
            marketDescription: `${title} ${description}`,
          });
          setPendingCashOutHash(hash);
        }
      })
      .catch((error) => {
        setPendingCashOut(false);
        console.error("Error when trying to claim winnings: ", error?.message);
        addTransaction({
          hash: `cash-out-failed${Date.now()}`,
          chainId: loginAccount?.chainId,
          seen: false,
          status: TX_STATUS.FAILURE,
          from: account,
          addedTime: new Date().getTime(),
          message: `Cashed Out Shares`,
          marketDescription: `${title} ${description}`,
        });
      });
  };
  const hasCompleteSets = getCompleteSetsAmount(balances?.marketShares[marketId]?.outcomeShares) !== "0";

  if (!claimableWinnings && !showTradeButton && !hasCompleteSets) return null;

  return (
    <div className={Styles.PositionFooter}>
      <span>
        {claimableWinnings && <p>{`${formatPercent(settlementFee).full} fee charged on settlement`}</p>}
        {hasCompleteSets && <p>No fee charged when cashing out shares</p>}
      </span>
      {hasCompleteSets && !hasWinner && (
        <PrimaryThemeButton
          text={pendingCashOut ? AWAITING_CONFIRM : "Cash Out Shares"}
          action={cashOut}
          subText={pendingCashOut && AWAITING_CONFIRM_SUBTEXT}
          disabled={disableCashOut}
        />
      )}
      {claimableWinnings && (
        <>
          <PrimaryThemeButton
            text={
              !pendingClaim
                ? `Claim Winnings (${formatCash(claimableWinnings?.claimableBalance, amm?.cash?.name).full})`
                : AWAITING_CONFIRM
            }
            subText={pendingClaim && AWAITING_CONFIRM_SUBTEXT}
            action={claim}
            disabled={disableClaim}
          />
        </>
      )}
      {showTradeButton && (
        <MarketLink id={marketId} ammId={amm?.id}>
          <SecondaryThemeButton text="trade" />
        </MarketLink>
      )}
    </div>
  );
};

export const AllPositionTable = ({ page, claimableFirst = false }) => {
  const {
    balances: { marketShares },
  }: UserState = useUserStore();
  const {
    settings: { showResolvedPositions },
  } = useSimplifiedStore();
  const positions = marketShares
    ? ((Object.values(marketShares).filter((s) => s.positions.length) as unknown[]) as {
      ammExchange: AmmExchange;
      positions: PositionBalance[];
      claimableWinnings: Winnings;
    }[]).filter(
      (position) =>
        showResolvedPositions ||
        position?.claimableWinnings ||
        (!showResolvedPositions && !position.ammExchange.market.hasWinner)
    )
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
  const {
    settings: { timeFormat },
  } = useSimplifiedStore();

  const marketAmmId = market?.marketId;
  const seenMarketPositionWarningAdd = seenPositionWarnings && seenPositionWarnings[marketAmmId]?.add;
  const seenMarketPositionWarningRemove = seenPositionWarnings && seenPositionWarnings[marketAmmId]?.remove;
  const { hasLiquidity } = ammExchange;

  return (
    <>
      <div className={Styles.PositionTable}>
        {!singleMarket && <MarketTableHeader timeFormat={timeFormat} market={market} ammExchange={ammExchange} />}
        <PositionHeader />
        {positions.length === 0 && <span>No positions to show</span>}
        {positions &&
          positions
            .filter((p) => p.visible)
            .map((position, id) => <PositionRow key={String(id)} position={position} hasLiquidity={hasLiquidity} />)}
        <PositionFooter showTradeButton={!singleMarket} market={market} claimableWinnings={claimableWinnings} />
      </div>
      {!seenMarketPositionWarningAdd &&
        singleMarket &&
        positions.filter((position) => position.positionFromAddLiquidity).length > 0 && (
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

// TODO: the "40%"" below should be replaced with a real rewards calc to
// provide a 0%-100% string value to fill the progress bar.
export const BonusReward = ({
  pendingBonusRewards,
  rewardsInfo,
}: {
  pendingBonusRewards: PendingUserReward;
  rewardsInfo: RewardsInfo;
}) => {
  const bonusAmount = formatToken(pendingBonusRewards?.pendingBonusRewards || "0")?.formatted;
  const { beginTimestamp } = rewardsInfo;
  const now = Math.floor(new Date().getTime() / 1000);
  const endTimestamp: number = pendingBonusRewards?.endBonusTimestamp || 0;
  const secondsRemaining = endTimestamp - now;
  const totalSeconds = endTimestamp - beginTimestamp;
  let filled = (1 - (secondsRemaining / totalSeconds)) * 100
  if (now > endTimestamp) filled = 100;
  const dateOnly = getMarketEndtimeDate(endTimestamp);
  const countdownDuration = timeTogo(endTimestamp);
  return (
    <article className={Styles.BonusReward}>
      <h4>Bonus Reward</h4>
      <p>Keep your liquidity in the pool until the unlock period to get a 20% bonus on top of your rewards</p>
      <span>
        <span style={{ width: `${filled}%` }} />
      </span>
      <h4>
        {filled === 100 ? `Bonus Unlocked` : `Bonus Unlock`}: {bonusAmount} {MaticIcon}
      </h4>
      <p>
        {dateOnly} ({countdownDuration})
      </p>
    </article>
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
  const {
    balances: { lpTokens, marketShares },
  }: UserState = useUserStore();
  const {
    settings: { showResolvedPositions },
  } = useSimplifiedStore();

  const { ammExchanges, markets } = useDataStore();
  const marketId = ammExchange?.marketId;

  let userPositions = [];
  let winnings = null;
  if (marketId && marketShares) {
    userPositions = marketShares[marketId] ? marketShares[marketId].positions : [];
    winnings = marketShares[marketId] ? marketShares[marketId]?.claimableWinnings : null;
  }
  const market = ammExchange?.market;

  const positions = marketShares
    ? ((Object.values(marketShares).filter((s) => s.positions.length) as unknown[]) as {
      ammExchange: AmmExchange;
      positions: PositionBalance[];
      claimableWinnings: Winnings;
    }[]).filter(
      (position) =>
        showResolvedPositions ||
        position?.claimableWinnings ||
        (!showResolvedPositions && !position.ammExchange.market.hasWinner)
    )
    : [];
  const liquidities = lpTokens
    ? Object.keys(lpTokens).map((marketId) => ({
      ammExchange: ammExchanges[marketId],
      market: markets[marketId],
      lpTokens: lpTokens[marketId],
    }))
    : [];

  const [tableView, setTableView] = useState(POSITIONS);
  const [page, setPage] = useQueryPagination({
    itemCount: tableView === POSITIONS ? positions.length : liquidities.length,
    itemsPerPage: POSITIONS_LIQUIDITY_LIMIT,
  });

  useEffect(() => {
    setPage(1);
  }, [showResolvedPositions]);

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
        <span />
        {showActivityButton && (
          <TinyThemeButton
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
            <>{tableView === POSITIONS && <AllPositionTable page={page} claimableFirst={claimableFirst} />}</>
          )}
          {!marketId &&
            ((positions.length > 0 && tableView === POSITIONS) ||
              (liquidities.length > 0 && tableView === LIQUIDITY)) && (
              <Pagination
                page={page}
                useFull
                itemCount={tableView === POSITIONS ? positions.length : liquidities.length}
                itemsPerPage={POSITIONS_LIQUIDITY_LIMIT}
                action={(page) => setPage(page)}
                updateLimit={() => null}
                usePageLocation
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

interface ProcessedAmmTransaction extends AmmTransaction {
  displayCollateral: FormattedNumber;
  displayShares?: string;
  timestamp: string;
}

interface TransactionProps {
  key?: string;
  transaction: ProcessedAmmTransaction;
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
    <li>{timeSinceTimestamp(Number(transaction.timestamp))}</li>
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
            useFull
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
