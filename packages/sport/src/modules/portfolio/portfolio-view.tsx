import React, { useState } from "react";
import Styles from "./portfolio-view.styles.less";
import Activity from "./activity";
// import { PositionsLiquidityViewSwitcher } from '../common/tables';
// import { AppViewStats, NetworkMismatchBanner } from '../common/labels';
import {
  ContractCalls,
  Formatter,
  Icons,
  Constants,
  createBigNumber,
  Stores,
  SEO,
  ButtonComps,
} from "@augurproject/comps";
import { PORTFOLIO_HEAD_TAGS } from "../seo-config";
import { Cash } from "@augurproject/comps/build/types";
import { EventBetsTable } from '../common/tables';

const { claimWinnings, claimFees } = ContractCalls;
const { formatCash } = Formatter;
const { ETH, TX_STATUS, USDC } = Constants;
const {
  Hooks: { useDataStore, useAppStatusStore, useScrollToTopOnMount, useUserStore },
  Utils: { keyedObjToArray },
} = Stores;
const { EthIcon, UsdIcon, WinnerMedal } = Icons;
const { PrimaryButton } = ButtonComps;

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
  // const canClaimETH = useCanExitCashPosition(ethCash);
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
          <ClaimableTicket amount="$200" button={<PrimaryButton text="CLAIM WINNINGS" action={() => {}} />} />
          <ClaimableTicket amount="$200" button={<PrimaryButton text="CLAIM WINNINGS" action={() => {}} />} />
          <ClaimableTicket amount="$200" button={<PrimaryButton text="CLAIM WINNINGS" action={() => {}} />} />
        </>
      )}
      {isLogged && USDCTotals.hasWinnings && (
        <ClaimableTicket
          amount={formatCash(USDCTotals.total, usdcCash?.name).full}
          button={
            <PrimaryButton
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
            <PrimaryButton
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
            <PrimaryButton
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

  return (
    <div className={Styles.PortfolioView}>
      <SEO {...PORTFOLIO_HEAD_TAGS} />
      <section>
        <h1>My Bets section... all these components need to be added/worked on but this is the page... yay?</h1>
        <EventBetsTable EventPositionData={MOCK_EVENT_POSITIONS_DATA} />
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
  ML: 'MoneyLine',
  SP: 'Spread',
  OU: 'Over / Under',
};
const MOCK_EVENT_POSITIONS_DATA = {
  "0xdeadbeef-0": {
    eventId: '0xdeadbeef-0',
    eventTitle: 'River Plate vs Boca Juniors',
    eventStartTime: now,
    bets: {
      '0xfaketxhash01': {
        marketId: '0xfakeMarket01',
        marketEventType: MET.SP,
        name: 'River Plate, +2',
        id: 1,
        wager: '10.00',
        price: '0.125',
        toWin: '70.00',
        date: now - 2000,
        cashoutAmount: '0.00',
        canCashOut: true,
        hasCashedOut: false,
      },
      '0xfaketxhash02': {
        marketId: '0xfakeMarket01',
        marketEventType: MET.ML,
        name: 'River Plate, +2',
        id: 1,
        wager: '10.00',
        price: '0.125',
        toWin: null,
        date: now - 2500,
        cashoutAmount: '5.60',
        canCashOut: false,
        hasCashedOut: true,
      },
      '0xfaketxhash03': {
        marketId: '0xfakeMarket01',
        marketEventType: MET.SP,
        name: 'River Plate, +2',
        id: 1,
        wager: '10.00',
        price: '0.125',
        toWin: '70.00',
        date: now - 3050,
        cashoutAmount: '0.00',
        canCashOut: true,
        hasCashedOut: false,
      }
    }
  }
}