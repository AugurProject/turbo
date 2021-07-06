import React, { useState, useEffect } from 'react';
import Styles from './portfolio-view.styles.less';
import Activity from './activity';
import { PositionsLiquidityViewSwitcher } from '../common/tables';
import { AppViewStats, NetworkMismatchBanner } from '../common/labels';
import {
  ContractCalls,
  Formatter,
  Icons,
  Constants,
  createBigNumber,
  Stores,
  SEO,
  ButtonComps,
  Utils,
} from '@augurproject/comps';
import { PORTFOLIO_HEAD_TAGS } from '../seo-config';
import { Cash } from '@augurproject/comps/build/types';
import BigNumber from 'bignumber.js';
import { ZERO } from 'modules/constants';
import { MaticIcon } from "@augurproject/comps/build/components/common/icons";

const {
  Formatter: { formatCash },
} = Utils;

const { claimWinnings, claimFees } = ContractCalls;
const { formatEther } = Formatter;
const { ACTIVITY, TABLES, TX_STATUS, USDC } = Constants;
const {
  Hooks: {
    useDataStore,
    useAppStatusStore,
    useScrollToTopOnMount,
    useUserStore,
  },
  Utils: { keyedObjToArray },
} = Stores;
const { UsdIcon } = Icons;
const { PrimaryButton } = ButtonComps;

const calculateTotalWinnings = (claimbleMarketsPerCash): {total: BigNumber, ids: string[], address: string}[] => {
  const factories = claimbleMarketsPerCash.reduce(
    (p, {
      ammExchange: { turboId, marketFactoryAddress },
      claimableWinnings: { claimableBalance },
    }) => {
      const factory = p[marketFactoryAddress] || { total: ZERO, ids: []};
      factory.total = factory.total.plus(createBigNumber(claimableBalance));
      factory.ids.push(turboId);
      factory.address = marketFactoryAddress;
      return {...p, [marketFactoryAddress]: factory}
    }, {}
  );
  return Object.values(factories);
};

export const getClaimAllMessage = (cash: Cash): string => `Claim All ${cash?.name} Winnings`;
export const getClaimFeesMessage = (cash: Cash): string => `Claim All ${cash?.name} Fees`;

const handleClaimAll = (
  loginAccount,
  cash,
  ids,
  address,
  addTransaction,
  canClaim,
  setPendingClaim
) => {
  const from = loginAccount?.account;
  const chainId = loginAccount?.chainId;
  if (from && canClaim) {
    setPendingClaim(true);
    claimWinnings(from, loginAccount?.library, ids, address)
      .then(response => {
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
            marketDescription: '',
          });
        }
      })
      .catch(error => {
        setPendingClaim(false);
        console.log('Error when trying to claim winnings: ', error?.message);
        addTransaction({
          hash: `claim-all-failed${Date.now()}`,
          chainId,
          seen: false,
          status: TX_STATUS.FAILURE,
          from,
          addedTime: new Date().getTime(),
          message: getClaimAllMessage(cash),
          marketDescription: '',
        });
      });
  } 
};

const handleClaimFees = (
  loginAccount,
  cash,
  ids,
  address,
  addTransaction,
  canClaim,
  setPendingClaimFees
) => {
  const from = loginAccount?.account;
  const chainId = loginAccount?.chainId;
  if (from && canClaim) {
    setPendingClaimFees(true);
    claimFees(from, loginAccount?.library, address)
      .then(response => {
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
            marketDescription: '',
          });
        }
      })
      .catch(error => {
        setPendingClaimFees(false);
        console.log('Error when trying to claim winnings: ', error?.message);
      });
  } 
};

export const RewardsSection = () => {
  const {
    balances
  } = useUserStore();
  const total = formatEther(balances?.totalRewards || "0").formatted;
  return (
    <div className={Styles.RewardsSection}>
      <div>
        <span>Available Liquidity Provider Reward</span>
        <span>(Will be claimed automatically when removing liquidity per market)</span>
      </div>
      <div>
        <span>
          {total}
          {MaticIcon}
        </span>
      </div>
    </div>
  );
};

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
  const claimableMarkets = marketShares
    ? keyedObjToArray(marketShares).filter((m) => !!m?.claimableWinnings)
    : [];
  const keyedCash = keyedObjToArray(cashes);
  const usdcCash = keyedCash.find((c) => c?.name === USDC);
  const MarketFactoryTotals = calculateTotalWinnings(claimableMarkets);
  const hasClaimableFees = createBigNumber(claimableFees || "0").gt(0);
  const disableClaimUSDCWins =
  pendingClaim ||
    Boolean(transactions.find((t) => t.message === getClaimAllMessage(usdcCash) && t.status === TX_STATUS.PENDING));
  const disableClaimUSDCFees =
  pendingClaimFees ||
      Boolean(transactions.find((t) => t.message === getClaimFeesMessage(usdcCash) && t.status === TX_STATUS.PENDING));

  return (
    <div className={Styles.ClaimableWinningsSection}>
      {isLogged && MarketFactoryTotals.length > 0 && (
        MarketFactoryTotals.map(factory => (
        <PrimaryButton
          key={factory.address}
          text={
            !pendingClaim
              ? `Claim Winnings (${
                  formatCash(factory.total, usdcCash?.name).full
                })`
              : `Waiting for Confirmation`
          }
          subText={pendingClaim && `(Confirm this transaction in your wallet)`}
          disabled={disableClaimUSDCWins}
          icon={!pendingClaim && UsdIcon}
          action={() => {
            handleClaimAll(
              loginAccount,
              usdcCash,
              factory.ids,
              factory.address,
              addTransaction,
              true,
              setPendingClaim
            );
          }}
        />)))}
      {isLogged && hasClaimableFees && (
        MarketFactoryTotals.map(factory => (
        <PrimaryButton
          text={!pendingClaimFees ? `Claim Fees (${
            formatCash(claimableFees, USDC).full
          })` : `Waiting for Confirmation`}
          disabled={disableClaimUSDCFees}
          action={() => {
            handleClaimFees(
              loginAccount,
              usdcCash,
              factory.ids,
              factory.address,
              addTransaction,
              true,
              setPendingClaimFees
            );
          }}
        />
        )))}
    </div>
  );
};

export const PortfolioView = () => {
  const { isMobile } = useAppStatusStore();
  const [view, setView] = useState(TABLES);

  useScrollToTopOnMount();

  useEffect(() => {
    if (!isMobile) setView(TABLES);
  }, [isMobile]);

  return (
    <div className={Styles.PortfolioView}>
      <SEO {...PORTFOLIO_HEAD_TAGS} />
      <section>
        <NetworkMismatchBanner />
        <AppViewStats small />
        <RewardsSection />
        <ClaimWinningsSection />
        <PositionsLiquidityViewSwitcher
          showActivityButton={isMobile}
          setTables={() => setView(TABLES)}
          setActivity={() => setView(ACTIVITY)}
          view={view}
          claimableFirst
        />
        {view === ACTIVITY && <Activity />}
      </section>
      <section>
        <Activity />
      </section>
    </div>
  );
};

export default PortfolioView;
