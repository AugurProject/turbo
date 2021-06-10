import React, { useState } from "react";
import Styles from "./portfolio-view.styles.less";
import Activity from "./activity";
import { ContractCalls, Formatter, Constants, createBigNumber, Stores, SEO, Components } from "@augurproject/comps";
import { PORTFOLIO_HEAD_TAGS } from "../seo-config";
import { Cash } from "@augurproject/comps/build/types";
import { EventBetsSection } from "../common/tables";
import { DailyFutureSwitch } from "../categories/categories";

const { claimWinnings, claimFees } = ContractCalls;
const { formatCash } = Formatter;
const { ETH, TX_STATUS, USDC, marketStatusItems, OPEN } = Constants;
const {
  Hooks: { useDataStore, useAppStatusStore, useScrollToTopOnMount, useUserStore },
  Utils: { keyedObjToArray },
} = Stores;
const {
  SelectionComps: { SquareDropdown },
  ButtonComps: { PrimaryThemeButton },
  Icons: { WinnerMedal },
  InputComps: { SearchInput },
} = Components;

const calculateTotalWinnings = (claimbleMarketsPerCash) => {
  let total = createBigNumber("0");
  let ids = [];
  let factories = [];
  claimbleMarketsPerCash.forEach(
    ({ ammExchange: { turboId, marketFactoryAddress }, claimableWinnings: { claimableBalance } }) => {
      total = total.plus(createBigNumber(claimableBalance));
      // @ts-ignore
      ids.push(turboId);
      factories.push(marketFactoryAddress);
    }
  );
  return {
    hasWinnings: !total.eq(0),
    total,
    ids,
    factories,
  };
};

export const getClaimAllMessage = (cash: Cash): string => `Claim All ${cash?.name} Winnings`;
export const getClaimFeesMessage = (cash: Cash): string => `Claim All ${cash?.name} Fees`;

const handleClaimAll = (loginAccount, cash, ids, factories, addTransaction, canClaim, setPendingClaim) => {
  const from = loginAccount?.account;
  const chainId = loginAccount?.chainId;
  if (from && canClaim) {
    setPendingClaim(true);
    claimWinnings(from, loginAccount?.library, ids, factories)
      .then((response) => {
        // handle transaction response here
        setPendingClaim(false);
        if (response) {
          const { hash } = response;
          addTransaction({
            hash,
            chainId,
            seen: false,
            status: TX_STATUS.PENDING,
            from,
            addedTime: new Date().getTime(),
            message: getClaimAllMessage(cash),
            marketDescription: "",
          });
        }
      })
      .catch((error) => {
        setPendingClaim(false);
        console.log("Error when trying to claim winnings: ", error?.message);
      });
  }
};

const handleClaimFees = (loginAccount, cash, ids, factories, addTransaction, canClaim, setPendingClaimFees) => {
  const from = loginAccount?.account;
  const chainId = loginAccount?.chainId;
  if (from && canClaim) {
    setPendingClaimFees(true);
    claimFees(from, loginAccount?.library, factories)
      .then((response) => {
        // handle transaction response here
        setPendingClaimFees(false);
        if (response) {
          const { hash } = response;
          addTransaction({
            hash,
            chainId,
            seen: false,
            status: TX_STATUS.PENDING,
            from,
            addedTime: new Date().getTime(),
            message: getClaimFeesMessage(cash),
            marketDescription: "",
          });
        }
      })
      .catch((error) => {
        setPendingClaimFees(false);
        console.log("Error when trying to claim winnings: ", error?.message);
      });
  }
};

const ClaimableTicket = ({ amount, button }) => (
  <section className={Styles.ClaimableTicket}>
    {WinnerMedal}
    <p>
      You have <b>{amount}</b> in winnings to claim in markets
    </p>
    {button}
  </section>
);

export const ClaimWinningsSection = () => {
  const { isLogged } = useAppStatusStore();
  const {
    balances: { marketShares, claimableFees },
    loginAccount,
    transactions,
    actions: { addTransaction },
  } = useUserStore();
  const [pendingClaim, setPendingClaim] = useState(false);
  const [pendingClaimFees, setPendingClaimFees] = useState(false);
  const { cashes } = useDataStore();
  const claimableMarkets = marketShares ? keyedObjToArray(marketShares).filter((m) => !!m?.claimableWinnings) : [];
  const keyedCash = keyedObjToArray(cashes);
  const ethCash = keyedCash.find((c) => c?.name === ETH);
  const usdcCash = keyedCash.find((c) => c?.name === USDC);
  const claimableEthMarkets = claimableMarkets.filter((m) => m.claimableWinnings.sharetoken === ethCash?.shareToken);
  const ETHTotals = calculateTotalWinnings(claimableEthMarkets);
  const USDCTotals = calculateTotalWinnings(claimableMarkets);
  const canClaimETH = true;
  const hasClaimableFees = createBigNumber(claimableFees || "0").gt(0);
  const disableClaimUSDCWins =
    pendingClaim ||
    Boolean(transactions.find((t) => t.message === getClaimAllMessage(usdcCash) && t.status === TX_STATUS.PENDING));
  const disableClaimUSDCFees =
    pendingClaimFees ||
    Boolean(transactions.find((t) => t.message === getClaimFeesMessage(usdcCash) && t.status === TX_STATUS.PENDING));

  const hasFees = USDCTotals.hasWinnings && ETHTotals.hasWinnings && hasClaimableFees;

  return (
    <div className={Styles.ClaimableWinningsSection}>
      {isLogged && !hasFees && <div>{WinnerMedal} Any winnings will show here</div>}
      {isLogged && hasFees && (
        <>
          <ClaimableTicket amount="$200" button={<PrimaryThemeButton text="CLAIM WINNINGS" action={() => {}} />} />
          <ClaimableTicket amount="$200" button={<PrimaryThemeButton text="CLAIM WINNINGS" action={() => {}} />} />
          <ClaimableTicket amount="$200" button={<PrimaryThemeButton text="CLAIM WINNINGS" action={() => {}} />} />
        </>
      )}
      {isLogged && USDCTotals.hasWinnings && (
        <ClaimableTicket
          amount={formatCash(USDCTotals.total, usdcCash?.name).full}
          button={
            <PrimaryThemeButton
              text={!pendingClaim ? `Claim Winnings` : `Awaiting Signature`}
              subText={pendingClaim && `(Confirm this transaction in your wallet)`}
              disabled={disableClaimUSDCWins}
              action={() => {
                handleClaimAll(
                  loginAccount,
                  usdcCash,
                  USDCTotals.ids,
                  USDCTotals.factories,
                  addTransaction,
                  true,
                  setPendingClaim
                );
              }}
            />
          }
        />
      )}
      {isLogged && ETHTotals.hasWinnings && (
        <ClaimableTicket
          amount={formatCash(ETHTotals.total, ethCash?.name).full}
          button={
            <PrimaryThemeButton
              text="Claim Winnings"
              action={() => {
                handleClaimAll(
                  loginAccount,
                  ethCash,
                  ETHTotals.ids,
                  ETHTotals.factories,
                  addTransaction,
                  canClaimETH,
                  setPendingClaim
                );
              }}
            />
          }
        />
      )}
      {isLogged && hasClaimableFees && (
        <ClaimableTicket
          amount={formatCash(claimableFees, USDC).full}
          button={
            <PrimaryThemeButton
              text={!pendingClaimFees ? `Claim Fees` : `Awaiting Signature`}
              disabled={disableClaimUSDCFees}
              action={() => {
                handleClaimFees(
                  loginAccount,
                  usdcCash,
                  USDCTotals.ids,
                  USDCTotals.factories,
                  addTransaction,
                  true,
                  setPendingClaimFees
                );
              }}
            />
          }
        />
      )}
    </div>
  );
};

export const PortfolioView = () => {
  useScrollToTopOnMount();
  const [filter, setFilter] = useState("");
  const [soryBy, setSortBy] = useState(OPEN);
  const [eventTypeFilter, setEventTypeFilter] = useState(0);
  return (
    <div className={Styles.PortfolioView}>
      <SEO {...PORTFOLIO_HEAD_TAGS} />
      <section>
        <ul>
          <SquareDropdown
            onChange={(value) => {
              setSortBy(value);
            }}
            options={marketStatusItems}
            defaultValue={soryBy}
            preLabel="Market Status"
          />
          <DailyFutureSwitch selection={eventTypeFilter} setSelection={(id) => setEventTypeFilter(id)} />
          <SearchInput
            value={filter}
            // @ts-ignore
            onChange={(e) => setFilter(e.target.value)}
            clearValue={() => setFilter("")}
          />
        </ul>
        <EventBetsSection EventPositionData={MOCK_EVENT_POSITIONS_DATA} />
      </section>
      <section>
        <ClaimWinningsSection />
        <Activity />
      </section>
    </div>
  );
};

export default PortfolioView;

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
        date: now - 2000,
        cashoutAmount: "0.00",
        canCashOut: true,
        hasCashedOut: false,
      },
      "0xfaketxhash02": {
        marketId: "0xfakeMarket02",
        marketEventType: MET.ML,
        name: "River Plate",
        id: 1,
        wager: "10.00",
        price: "0.125",
        toWin: null,
        date: now - 2500,
        cashoutAmount: "5.60",
        canCashOut: false,
        hasCashedOut: true,
      },
      "0xfaketxhash03": {
        marketId: "0xfakeMarket03",
        marketEventType: MET.SP,
        name: "Event Canceled",
        id: 0,
        wager: "10.00",
        price: "0.125",
        toWin: "70.00",
        date: now - 3050,
        cashoutAmount: "0.00",
        canCashOut: true,
        hasCashedOut: false,
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
        date: now - 2000,
        cashoutAmount: "0.00",
        canCashOut: true,
        hasCashedOut: false,
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
        date: now - 7000,
        cashoutAmount: "0.00",
        canCashOut: true,
        hasCashedOut: false,
      },
      "0xfaketxhash06": {
        marketId: "0xfakeMarket06",
        marketEventType: `${MET.OU} 220.5`,
        name: "Chicago Bulls, Over 220.5",
        id: 1,
        wager: "10.00",
        price: "0.125",
        toWin: null,
        date: now - 7500,
        cashoutAmount: "5.60",
        canCashOut: false,
        hasCashedOut: true,
      },
      "0xfaketxhash07": {
        marketId: "0xfakeMarket07",
        marketEventType: MET.ML,
        name: "Chicago Bulls",
        id: 1,
        wager: "10.00",
        price: "0.125",
        toWin: "70.00",
        date: now - 8050,
        cashoutAmount: "0.00",
        canCashOut: false,
        hasCashedOut: false,
      },
    },
  },
};
