import React, { useState } from "react";
import classNames from "classnames";
import Styles from "./portfolio-view.styles.less";
import Activity from "./activity";
import { Formatter, Constants, createBigNumber, Stores, SEO, Components, ContractCalls } from "@augurproject/comps";
import { PORTFOLIO_HEAD_TAGS } from "../seo-config";
import { Cash } from "@augurproject/comps/build/types";
import { EventBetsSection } from "../common/tables";
import { DailyLongSwitch } from "../categories/categories";
import { useSportsStore } from "../stores/sport";
import { useBetslipStore, processClosedMarketShares, processClosedPositionBalances } from "../stores/betslip";
import { BetType } from "../stores/constants";
import BigNumber from "bignumber.js";
import { claimAll } from "modules/utils";

const { formatCash } = Formatter;
const { TX_STATUS, USDC, marketStatusItems, OPEN } = Constants;
const {
  Hooks: { useDataStore, useAppStatusStore, useScrollToTopOnMount, useUserStore },
  Utils: { keyedObjToArray },
} = Stores;
const {
  SelectionComps: { SquareDropdown },
  ButtonComps: { PrimaryThemeButton, SecondaryThemeButton, TinyThemeButton },
  Icons: { WinnerMedal, SimpleChevron },
  InputComps: { SearchInput },
  LabelComps: { NetworkMismatchBanner },
} = Components;
const { getMarketFactoryData } = ContractCalls;

const calculateTotalWinnings = (claimbleMarketsPerCash): { total: BigNumber; ids: string[]; address: string }[] => {
  const factories = claimbleMarketsPerCash.reduce(
    (p, { ammExchange: { turboId, marketFactoryAddress }, claimableWinnings: { claimableBalance } }) => {
      const factory = p[marketFactoryAddress] || { total: new BigNumber(0), ids: [] };
      factory.total = factory.total.plus(createBigNumber(claimableBalance || 0));
      factory.ids.push(turboId);
      factory.address = marketFactoryAddress;
      factory.name = getMarketFactoryData(marketFactoryAddress)?.description?.toUpperCase();
      return { ...p, [marketFactoryAddress]: factory };
    },
    {}
  );
  return Object.values(factories);
};

export const getClaimAllMessage = (cash: Cash): string => `Claim All ${cash?.name} Winnings`;

const handleClaimAll = async (loginAccount, ids, factoryAddress, addTransaction, setPendingClaim) => {
  const from = loginAccount?.account;
  if (from) {
    setPendingClaim(true);
    const txDetails = await claimAll(loginAccount, ids, factoryAddress).catch((e) => console.error(e));
    setPendingClaim(false);
    if (txDetails) addTransaction(txDetails);
  }
};

const ClaimableTicket = ({
  amount,
  cash,
  USDCTotal,
}: {
  amount: string;
  cash: Cash;
  USDCTotal: any;
  key?: string;
}): React.Component => {
  const {
    loginAccount,
    transactions,
    actions: { addTransaction },
  } = useUserStore();
  const [pendingClaim, setPendingClaim] = useState(false);
  const disableClaimUSDCWins = Boolean(
    transactions.find((t) => t.message === getClaimAllMessage(cash) && t.status === TX_STATUS.PENDING)
  );

  return (
    <section className={Styles.ClaimableTicket}>
      {WinnerMedal}
      <p>
        You have <b>{amount}</b> {`in winnings to claim on ${USDCTotal.name} markets`}
      </p>
      <PrimaryThemeButton
        text={!pendingClaim ? `Claim Winnings` : `Awaiting Signature`}
        disabled={pendingClaim || disableClaimUSDCWins}
        small
        action={() => {
          handleClaimAll(loginAccount, USDCTotal.ids, USDCTotal.address, addTransaction, setPendingClaim);
        }}
      />
    </section>
  );
};

export const ClaimWinningsSection = () => {
  const { isLogged } = useAppStatusStore();
  const {
    balances: { marketShares },
  } = useUserStore();
  const { cashes } = useDataStore();
  const claimableMarkets = marketShares ? keyedObjToArray(marketShares).filter((m) => !!m?.claimableWinnings) : [];
  const keyedCash = keyedObjToArray(cashes);
  const usdcCash = keyedCash.find((c) => c?.name === USDC);
  const USDCTotals = calculateTotalWinnings(claimableMarkets);
  const hasWinnings = USDCTotals.length > 0;

  return (
    <div className={Styles.ClaimableWinningsSection}>
      {isLogged && !hasWinnings && <div>{WinnerMedal} Any winnings will show here</div>}
      {isLogged &&
        hasWinnings &&
        USDCTotals.map((USDCTotal) => (
          <ClaimableTicket
            key={`${USDCTotal?.total}-${usdcCash?.name}`}
            amount={formatCash(USDCTotal.total, usdcCash?.name).full}
            cash={usdcCash}
            USDCTotal={USDCTotal}
          />
        ))}
    </div>
  );
};

const useEventPositionsData = (sortBy: string, search: string) => {
  const { markets, transactions } = useDataStore();
  const {
    account,
    balances: { marketShares },
  } = useUserStore();
  const { marketEvents } = useSportsStore();
  const { active } = useBetslipStore();
  const { positionBalance } = transactions;

  const activeMarketIds = Object.values(active)
    .map(bet => (bet as unknown as BetType).marketId)
    .filter(id => sortBy === OPEN ? !markets[id]?.hasWinner : markets[id]?.hasWinner);

  const marketIds = Array.from([
      ...new Set(
        activeMarketIds
      ),
    ...new Set([...(positionBalance || [])?.map((p) => p?.marketId), ...Object.keys(marketShares)])
  ]).filter(id => sortBy === OPEN ? !markets[id]?.hasWinner : markets[id]?.hasWinner);

  const events = Array.from(new Set(marketIds.map((marketId) => markets?.[marketId]?.eventId)))
    .map((eventId) => marketEvents[eventId])
    .filter((v) => v);

  const eventPositions = events.reduce((acc, event) => {
    const out = { ...acc };
    const bets = Object.entries(active).reduce((a, [txhash, bet]: [string, BetType]) => {
      let result = { ...a };
      const marketId = bet?.marketId;
      if (event?.marketIds?.includes(marketId.toLowerCase())) {
        result[txhash] = bet;
      }
      return result;
    }, {});
    if (Object.keys(bets).length === 0) return out;
    out[event?.eventId] = {
      eventId: event?.eventId,
      eventTitle: event?.description,
      eventStartTime: event?.startTimestamp,
      bets,
      marketIds: event?.marketIds,
    };
    return out;
  }, {});

  let eventPositionsData = events.reduce((acc, event) => {
    const out = { ...acc };
    const getBets = ([...Object.keys(marketShares)] || [])
      .filter(marketId => event.marketIds.includes(marketId) && !activeMarketIds.includes(marketId))
      .reduce((p, marketId) => ([...p, ...marketShares[marketId].positions]),[]);
    const getPositions = [...(positionBalance || [])]
      .filter(b => event.marketIds.includes(b.marketId));
    
    const bets = processClosedMarketShares({
      marketPositions: getBets,
      markets,
      account,
      transactions,
      marketEvents,
    });

    const betsPositions = processClosedPositionBalances({
      marketPositions: getPositions,
      markets,
      marketEvents,
    });
    
    const allBets = [...bets, ...betsPositions].reduce((p, bet) => ({ ...p, [bet.betId]: bet }), {});

    if (Object.keys(allBets).length === 0) return out;
    out[event?.eventId] = {
      eventId: event?.eventId,
      eventTitle: event?.description,
      eventStartTime: event?.startTimestamp,
      bets: {...(out[event?.eventId]?.bets || {}), ...allBets},
      marketIds: event?.marketIds,
    };
    return out;
  }, eventPositions);

  if (!!search) {
    eventPositionsData = Object.entries(eventPositionsData)
      .filter(([eventID, event]: any) => {
        const searchRegex = new RegExp(search, "i");
        const { eventTitle, eventStartTime, bets } = event;
        const eventStart = new Date(eventStartTime * 1000);
        const matchEventTitle = searchRegex.test(eventTitle);
        const matchDate = searchRegex.test(eventStart.toString());
        const matchOutcomes = searchRegex.test(
          JSON.stringify(Object.entries(bets).map(([betId, bet]: any) => bet?.name))
        );
        return matchEventTitle || matchDate || matchOutcomes;
      })
      .reduce((acc, [eventId, event]) => {
        const out = { ...acc };
        out[eventId] = event;
        return out;
      }, {});
  }
  return eventPositionsData;
};

export const PortfolioView = () => {
  useScrollToTopOnMount();
  const [filter, setFilter] = useState("");
  const [sortBy, setSortBy] = useState(OPEN);
  const [eventTypeFilter, setEventTypeFilter] = useState(0);
  const [showActivity, setShowActivity] = useState(false);
  const eventPositionsData = useEventPositionsData(sortBy, filter);

  return (
    <div
      className={classNames(Styles.PortfolioView, {
        [Styles.ActivityShown]: showActivity,
      })}
    >
      <SEO {...PORTFOLIO_HEAD_TAGS} />
      <section>
        <NetworkMismatchBanner />
        <ClaimWinningsSection />
        <ul className={Styles.FilterSearchNav}>
          <SquareDropdown
            onChange={(value) => {
              setSortBy(value);
            }}
            options={marketStatusItems}
            defaultValue={sortBy}
            preLabel="Market Status"
          />
          <DailyLongSwitch selection={eventTypeFilter} setSelection={(id) => setEventTypeFilter(id)} />
          <SecondaryThemeButton text="YOUR ACTIVITY" action={() => setShowActivity(!showActivity)} small />
          <SearchInput value={filter} onChange={(e) => setFilter(e.target.value)} clearValue={() => setFilter("")} />
        </ul>
        <EventBetsSection eventPositionData={eventPositionsData} />
      </section>
      <section>
        <span onClick={() => setShowActivity(!showActivity)}>
          <TinyThemeButton icon={SimpleChevron} action={() => setShowActivity(!showActivity)} />
          <span>MY BETS</span>
        </span>
        <h2>Your Activity</h2>
        <ClaimWinningsSection />
        <Activity />
      </section>
    </div>
  );
};

export default PortfolioView;
