import React, { useState } from "react";
import classNames from "classnames";
import Styles from "./portfolio-view.styles.less";
import Activity from "./activity";
import { Formatter, Constants, createBigNumber, Stores, SEO, Components } from "@augurproject/comps";
import { PORTFOLIO_HEAD_TAGS } from "../seo-config";
import { Cash } from "@augurproject/comps/build/types";
import { EventBetsSection } from "../common/tables";
import { DailyFutureSwitch } from "../categories/categories";
import { useSportsStore } from "../stores/sport";
import { useBetslipStore } from "../stores/betslip";
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
  ButtonComps: { PrimaryThemeButton, SecondaryThemeButton },
  Icons: { WinnerMedal },
  InputComps: { SearchInput },
} = Components;

const calculateTotalWinnings = (claimbleMarketsPerCash): { total: BigNumber; ids: string[]; address: string }[] => {
  const factories = claimbleMarketsPerCash.reduce(
    (p, { ammExchange: { turboId, marketFactoryAddress }, claimableWinnings: { claimableBalance } }) => {
      const factory = p[marketFactoryAddress] || { total: new BigNumber(0), ids: [] };
      factory.total = factory.total.plus(createBigNumber(claimableBalance));
      factory.ids.push(turboId);
      factory.address = marketFactoryAddress;
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

const ClaimableTicket = ({ amount, cash, USDCTotal }) => {
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
        You have <b>{amount}</b> in winnings to claim in markets
      </p>
      <PrimaryThemeButton
        text={!pendingClaim ? `Claim Winnings` : `Awaiting Signature`}
        disabled={pendingClaim || disableClaimUSDCWins}
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
            amount={formatCash(USDCTotal.total, usdcCash?.name).full}
            cash={usdcCash}
            USDCTotal={USDCTotal}
          />
        ))}
    </div>
  );
};

const useEventPositionsData = () => {
  const { markets } = useDataStore();
  const { marketEvents } = useSportsStore();
  const { active } = useBetslipStore();
  const marketIds = Array.from(
    new Set(
      Object.entries(active)
        .map(([txhash, bet]) => {
          // @ts-ignore
          return bet.betId.slice(0, bet.betId.lastIndexOf("-"));
        })
        .filter((i) => i)
    )
  );
  const events = Array.from(new Set(marketIds.map((marketId) => markets?.[marketId]?.eventId))).map(
    (eventId) => marketEvents[eventId]
  );
  const eventPositionsData = events.reduce((acc, event) => {
    const out = { ...acc };
    const bets = Object.entries(active).reduce((a, [txhash, bet]) => {
      let result = { ...a };
      // @ts-ignore
      const marketId = bet?.betId.slice(0, bet?.betId.lastIndexOf("-"));
      if (event?.marketIds?.includes(marketId)) {
        result[txhash] = bet;
      }
      return result;
    }, {});
    out[event?.eventId] = {
      eventId: event?.eventId,
      eventTitle: event?.description,
      eventStartTime: event?.startTimestamp,
      bets,
    };
    return out;
  }, {});
  return eventPositionsData;
};

export const PortfolioView = () => {
  useScrollToTopOnMount();
  const [filter, setFilter] = useState("");
  const [soryBy, setSortBy] = useState(OPEN);
  const [eventTypeFilter, setEventTypeFilter] = useState(0);
  const [showActivity, setShowActivity] = useState(false);
  const eventPositionsData = useEventPositionsData();

  return (
    <div
      className={classNames(Styles.PortfolioView, {
        [Styles.ActivityShown]: showActivity,
      })}
    >
      <SEO {...PORTFOLIO_HEAD_TAGS} />
      <section>
        <ul className={Styles.FilterSearchNav}>
          <SquareDropdown
            onChange={(value) => {
              setSortBy(value);
            }}
            options={marketStatusItems}
            defaultValue={soryBy}
            preLabel="Market Status"
          />
          <DailyFutureSwitch selection={eventTypeFilter} setSelection={(id) => setEventTypeFilter(id)} />
          <SecondaryThemeButton text="YOUR ACTIVITY" action={() => setShowActivity(!showActivity)} small />
          <SearchInput
            value={filter}
            // @ts-ignore
            onChange={(e) => setFilter(e.target.value)}
            clearValue={() => setFilter("")}
          />
        </ul>
        <EventBetsSection eventPositionData={eventPositionsData} />
      </section>
      <section>
        <ClaimWinningsSection />
        <Activity />
      </section>
    </div>
  );
};

export default PortfolioView;
/*
const date = new Date();
const now = Math.floor(date.getTime() / 1000);
const MET = {
  ML: "MoneyLine",
  SP: "Spread",
  OU: "Over / Under",
};

const MOCK_EVENT_POSITIONS_DATA = {
  "0xdeadbeef-0": {
    eventId: "0xdeadbeef-0",
    eventTitle: "River Plate vs Boca Juniors",
    eventStartTime: now,
    bets: {
      "0xfaketxhash01": {
        marketId: "0xfakeMarket01",
        marketEventType: MET.SP,
        name: "River Plate, +2",
        id: 1,
        wager: "10.00",
        price: "0.125",
        toWin: "70.00",
        timestamp: now - 2000,
        cashoutAmount: "0.00",
        canCashOut: true,
      },
      "0xfaketxhash02": {
        marketId: "0xfakeMarket02",
        marketEventType: MET.ML,
        name: "River Plate",
        id: 1,
        wager: "10.00",
        price: "0.125",
        toWin: null,
        timestamp: now - 2500,
        cashoutAmount: "5.60",
        canCashOut: false,
      },
      "0xfaketxhash03": {
        marketId: "0xfakeMarket03",
        marketEventType: MET.SP,
        name: "Event Canceled",
        id: 0,
        wager: "10.00",
        price: "0.125",
        toWin: "70.00",
        timestamp: now - 3050,
        cashoutAmount: "0.00",
        canCashOut: true,
      },
    },
  },
  "0xdeadbeef-1": {
    eventId: "0xdeadbeef-1",
    eventTitle: "Dallas Mavericks Vs. Houston Rockets",
    eventStartTime: now - 1000,
    bets: {
      "0xfaketxhash04": {
        marketId: "0xfakeMarket4",
        marketEventType: MET.ML,
        name: "Dallas Mavericks",
        id: 1,
        wager: "10.00",
        price: "0.125",
        toWin: "70.00",
        timestamp: now - 2000,
        cashoutAmount: "0.00",
        canCashOut: true,
      },
    },
  },
  "0xdeadbeef-2": {
    eventId: "0xdeadbeef-2",
    eventTitle: "Chicago Bulls Vs. Brooklyn Nets",
    eventStartTime: now - 5000,
    bets: {
      "0xfaketxhash05": {
        marketId: "0xfakeMarket05",
        marketEventType: MET.SP,
        name: "Chicago Bulls, +5",
        id: 1,
        wager: "10.00",
        price: "0.125",
        toWin: "70.00",
        timestamp: now - 7000,
        cashoutAmount: "0.00",
        canCashOut: true,
      },
      "0xfaketxhash06": {
        marketId: "0xfakeMarket06",
        marketEventType: `${MET.OU} 220.5`,
        name: "Chicago Bulls, Over 220.5",
        id: 1,
        wager: "10.00",
        price: "0.125",
        toWin: null,
        timestamp: now - 7500,
        cashoutAmount: "5.60",
        canCashOut: false,
      },
      "0xfaketxhash07": {
        marketId: "0xfakeMarket07",
        marketEventType: MET.ML,
        name: "Chicago Bulls",
        id: 1,
        wager: "10.00",
        price: "0.125",
        toWin: "70.00",
        timestamp: now - 8050,
        cashoutAmount: "0.00",
        canCashOut: false,
      },
    },
  },
};
*/
