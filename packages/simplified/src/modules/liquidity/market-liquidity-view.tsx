import React, { useState, useEffect, useMemo } from "react";
import classNames from "classnames";
import Styles from "./market-liquidity-view.styles.less";
import CommonStyles from "../modal/modal.styles.less";
import ButtonStyles from "../common/buttons.styles.less";
import { useHistory, useLocation } from "react-router";
import { InfoNumbers, ApprovalButton } from "../market/trading-form";
import { BigNumber as BN } from "bignumber.js";
import {
  ContractCalls,
  useDataStore,
  useUserStore,
  Components,
  Utils,
  Constants,
  useApprovalStatus,
  createBigNumber,
  useAppStatusStore,
} from "@augurproject/comps";
import { AmmOutcome, MarketInfo, Cash, LiquidityBreakdown, DataState } from "@augurproject/comps/build/types";
import { useSimplifiedStore } from "../stores/simplified";
import {
  MODAL_CONFIRM_TRANSACTION,
  LIQUIDITY,
  MARKET_LIQUIDITY,
  CREATE,
  ADD,
  REMOVE,
  SHARES,
  USDC,
} from "../constants";
const {
  ButtonComps: { SecondaryThemeButton, TinyThemeButton },
  LabelComps: { CategoryIcon, WarningBanner },
  MarketCardComps: { MarketTitleArea, orderOutcomesForDisplay, unOrderOutcomesForDisplay },
  InputComps: { AmountInput, isInvalidNumber, OutcomesGrid },
  Links: { MarketLink },
  Icons: { WarningIcon, BackIcon, MaticIcon, USDCIcon },
} = Components;
const {
  checkConvertLiquidityProperties,
  doRemoveLiquidity,
  addLiquidityPool,
  estimateAddLiquidityPool,
  getRemoveLiquidity,
} = ContractCalls;
const {
  PathUtils: { makePath, parseQuery },
  Formatter: { formatSimpleShares, formatEther, formatCash },
  Calculations: { calcPricesFromOdds },
} = Utils;
const {
  BUY,
  MARKET_ID_PARAM_NAME,
  ApprovalAction,
  ApprovalState,
  ERROR_AMOUNT,
  CONNECT_ACCOUNT,
  ENTER_AMOUNT,
  INSUFFICIENT_BALANCE,
  ZERO,
  SET_PRICES,
  MINT_SETS,
  MODAL_ADD_LIQUIDITY,
  ONE,
  INVALID_PRICE,
  INVALID_PRICE_GREATER_THAN_SUBTEXT,
  INVALID_PRICE_ADD_UP_SUBTEXT,
  TX_STATUS,
} = Constants;

const defaultAddLiquidityBreakdown: LiquidityBreakdown = {
  lpTokens: "0",
  cashAmount: "0",
  minAmounts: [],
};
const MIN_PRICE = 0.02;

const TRADING_FEE_OPTIONS = [
  {
    id: 0,
    label: "0.0%",
    value: 0,
  },
  {
    id: 1,
    label: "0.5%",
    value: 0.5,
  },
  {
    id: 2,
    label: "1%",
    value: 1,
  },
  {
    id: 3,
    label: "2%",
    value: 2,
  },
];

const REMOVE_FOOTER_TEXT = `Removing liquidity may return shares; these shares may be sold for USDC if there is still liquidity in the pool. Winning shares can be redeemed for USDC after the market has finalized.`;

export const MarketLiquidityView = () => {
  const {
    settings: { timeFormat },
  } = useSimplifiedStore();
  const location = useLocation();
  const { [MARKET_ID_PARAM_NAME]: marketId, [MARKET_LIQUIDITY]: actionType } = parseQuery(location.search);
  const { markets } = useDataStore();
  const market = markets?.[marketId];

  if (!market) {
    return <div className={classNames(Styles.MarketLiquidityView)}>Market Not Found.</div>;
  }
  const { categories } = market;
  return (
    <div className={classNames(Styles.MarketLiquidityView)}>
      <BackBar {...{ market }} />
      <MarketLink id={marketId} dontGoToMarket={false}>
        <CategoryIcon {...{ categories }} />
        <MarketTitleArea {...{ ...market, timeFormat }} />
      </MarketLink>
      <LiquidityForm {...{ market, actionType }} />
      <LiquidityWarningFooter />
    </div>
  );
};

const BackBar = ({ market }) => {
  const history = useHistory();
  const {
    actions: { setModal },
  } = useAppStatusStore();
  const BackToLPPageAction = () =>
    history.push({
      pathname: makePath(LIQUIDITY),
    });
  return (
    <div className={Styles.BackBar}>
      <button onClick={BackToLPPageAction}>{BackIcon} Back To Pools</button>
      <TinyThemeButton
        action={() =>
          setModal({
            type: MODAL_ADD_LIQUIDITY,
            market,
            currency: USDC,
            liquidityModalType: MINT_SETS,
          })
        }
        text="Mint Complete Sets"
        small
      />
    </div>
  );
};

const LiquidityWarningFooter = () => (
  <article className={Styles.LiquidityWarningFooter}>
    <p>
      By adding liquidity you'll earn 1.50% of all trades on this market proportional to your share of the pool. Fees
      are added to the pool, accrue in real time and can be claimed by withdrawing your liquidity.
    </p>
    <span>{WarningIcon} Remove liquidity before the winning outcome is known to prevent any loss of funds</span>
  </article>
);

interface LiquidityFormProps {
  market: MarketInfo;
  actionType: string;
}

const orderMinAmountsForDisplay = (
  items: { amount: string; outcomeId: number; hide: boolean }[] = []
): { amount: string; outcomeId: number; hide: boolean }[] =>
  items.length > 0 && items[0].outcomeId === 0 ? items.slice(1).concat(items.slice(0, 1)) : items;

const getCreateBreakdown = (breakdown, market, balances, isRemove = false) => {
  const fullBreakdown = [
    ...orderMinAmountsForDisplay(breakdown.minAmounts)
      .filter((m) => !m.hide)
      .map((m) => ({
        label: `${market.outcomes[m.outcomeId]?.name} Shares`,
        value: `${formatSimpleShares(m.amount).formatted}`,
        svg: null,
      })),
    {
      label: isRemove ? "USDC" : "LP tokens",
      value: `${breakdown?.amount ? formatSimpleShares(breakdown.amount).formatted : "-"}`,
      svg: null,
    },
  ];
  const pendingRewards = balances?.pendingRewards?.[market.marketId]?.balance || "0";
  if (pendingRewards !== "0") {
    fullBreakdown.push({
      label: `LP Rewards`,
      value: `${formatEther(pendingRewards).formatted}`,
      svg: MaticIcon,
    });
  }
  return fullBreakdown;
};

const LiquidityForm = ({ market, actionType = ADD }: LiquidityFormProps) => {
  const history = useHistory();
  const {
    account,
    balances,
    loginAccount,
    actions: { addTransaction },
  } = useUserStore();
  const {
    actions: { setModal, closeModal },
  } = useAppStatusStore();
  const { blocknumber, cashes }: DataState = useDataStore();
  const BackToLPPageAction = () => {
    history.push({
      pathname: makePath(LIQUIDITY),
    });
    closeModal();
  };
  const [selectedAction, setSelectedAction] = useState(actionType);
  const isRemove = selectedAction === REMOVE;
  const { amm, isFuture } = market;
  const mustSetPrices = Boolean(!amm?.id);
  const hasInitialOdds = market?.initialOdds && market?.initialOdds?.length && mustSetPrices;
  const initialOutcomes = hasInitialOdds
    ? calcPricesFromOdds(market?.initialOdds, amm?.ammOutcomes)
    : amm?.ammOutcomes || [];

  const [outcomes, setOutcomes] = useState<AmmOutcome[]>(orderOutcomesForDisplay(initialOutcomes));

  const [chosenCash, updateCash] = useState<string>(USDC);
  const [breakdown, setBreakdown] = useState(defaultAddLiquidityBreakdown);
  const [estimatedLpAmount, setEstimatedLpAmount] = useState<string>("0");
  const tradingFeeSelection = TRADING_FEE_OPTIONS[2].id;
  const cash: Cash = cashes ? Object.values(cashes).find((c) => c.name === USDC) : Object.values(cashes)[0];
  const userTokenBalance = cash?.name ? balances[cash?.name]?.balance : "0";
  const shareBalance =
    balances && balances.lpTokens && balances.lpTokens[amm?.marketId] && balances.lpTokens[amm?.marketId].balance;
  const userMaxAmount = isRemove ? shareBalance : userTokenBalance;

  const [amount, setAmount] = useState(isRemove ? shareBalance : "");

  const approvedToTransfer = ApprovalState.APPROVED;
  const isApprovedToTransfer = approvedToTransfer === ApprovalState.APPROVED;
  const approvalActionType = isRemove ? ApprovalAction.REMOVE_LIQUIDITY : ApprovalAction.ADD_LIQUIDITY;
  const approvedMain = useApprovalStatus({
    cash,
    amm,
    refresh: blocknumber,
    actionType: approvalActionType,
  });
  const isApprovedMain = approvedMain === ApprovalState.APPROVED;
  const isApproved = isRemove ? isApprovedMain && isApprovedToTransfer : isApprovedMain;
  const totalPrice = outcomes.reduce((p, outcome) => (outcome.price === "" ? parseFloat(outcome.price) + p : p), 0);

  const onChainFee = useMemo(() => {
    const feeOption = TRADING_FEE_OPTIONS.find((t) => t.id === tradingFeeSelection);
    const feePercent = selectedAction === CREATE ? feeOption.value : amm?.feeInPercent;

    return String(new BN(feePercent).times(new BN(10)));
  }, [tradingFeeSelection, amm?.feeRaw]);

  const { buttonError, inputFormError, lessThanMinPrice, hasAmountErrors } = useErrorValidation({
    isRemove,
    outcomes,
    amount,
    actionType: selectedAction,
    isFuture,
    userMaxAmount,
    account,
  });

  useEffect(() => {
    let isMounted = true;
    const priceErrorsWithEmptyString = isRemove
      ? []
      : outcomes.filter((outcome) => parseFloat(outcome.price) >= 1 || outcome.price === "");

    if (priceErrorsWithEmptyString.length > 0 || hasAmountErrors) {
      return isMounted && setBreakdown(defaultAddLiquidityBreakdown);
    }

    const valid = isRemove
      ? true
      : checkConvertLiquidityProperties(account, market.marketId, amount, onChainFee, outcomes, cash, amm);
    if (!valid) {
      return isMounted && setBreakdown(defaultAddLiquidityBreakdown);
    }

    async function getResults() {
      let results: LiquidityBreakdown;
      if (isRemove) {
        results = await getRemoveLiquidity(amm, loginAccount?.library, amount, account, cash, market?.hasWinner);
      } else {
        results = await estimateAddLiquidityPool(
          account,
          loginAccount?.library,
          amm,
          cash,
          amount,
          unOrderOutcomesForDisplay(outcomes)
        );
      }

      if (!results) {
        return isMounted && setBreakdown(defaultAddLiquidityBreakdown);
      }
      isMounted && setBreakdown(results);
      isMounted && setEstimatedLpAmount(results.lpTokens);
    }

    if (isApproved && !buttonError) getResults();

    return () => {
      isMounted = false;
    };
  }, [account, amount, tradingFeeSelection, cash, isApproved, buttonError, totalPrice, isRemove, selectedAction]);

  const actionButtonText = !amount ? "Enter Amount" : "Review";
  const setPrices = (price, index) => {
    const newOutcomes = outcomes;
    newOutcomes[index].price = price;
    setOutcomes([...newOutcomes]);
  };

  const addTitle = isRemove ? "Increase Liqiudity" : "Add Liquidity";
  const now = Math.floor(new Date().getTime() / 1000);
  const pendingRewards = balances.pendingRewards?.[amm?.marketId];
  const hasPendingBonus =
    pendingRewards && now > pendingRewards.endEarlyBonusTimestamp && pendingRewards.pendingBonusRewards !== "0";
  const infoNumbers = getCreateBreakdown(breakdown, market, balances, isRemove);

  return (
    <section className={classNames(Styles.LiquidityForm, { [Styles.isRemove]: isRemove })}>
      <header>
        <button
          className={classNames({ [Styles.selected]: !isRemove })}
          onClick={() => {
            setAmount(amount === userMaxAmount ? "" : amount);
            setSelectedAction(Boolean(amm?.id) ? ADD : CREATE);
          }}
        >
          {addTitle}
        </button>
        {shareBalance && (
          <button
            className={classNames({ [Styles.selected]: isRemove })}
            onClick={() => {
              setAmount(shareBalance);
              setSelectedAction(REMOVE);
            }}
          >
            Remove Liquidity
          </button>
        )}
      </header>
      <main>
        <AmountInput
          heading="Deposit Amount"
          ammCash={cash}
          updateInitialAmount={(amount) => setAmount(amount)}
          initialAmount={amount}
          maxValue={userMaxAmount}
          chosenCash={isRemove ? SHARES : chosenCash}
          updateCash={updateCash}
          updateAmountError={() => null}
          error={hasAmountErrors}
        />
        <div className={Styles.Breakdown}>
          {isRemove && hasPendingBonus && (
            <WarningBanner
              className={CommonStyles.ErrorBorder}
              title="Increasing or removing your liquidity on a market before the bonus time is complete will result in the loss of your bonus rewards."
              subtitle={
                "In order to receive the bonus, your liquidity needs to remain unchanged until the bonus period is over."
              }
            />
          )}
          <span>{isRemove ? "Remove All Liquidity" : "You'll Receive"}</span>
          <InfoNumbers infoNumbers={infoNumbers} />
        </div>
        <div className={Styles.PricesAndOutcomes}>
          <span className={Styles.PriceInstructions}>
            <span>{mustSetPrices ? "Set the Price" : "Current Prices"}</span>
            {mustSetPrices && <span>(between 0.02 - 0.1). Total price of all outcomes must add up to 1.</span>}
          </span>
          <OutcomesGrid
            outcomes={outcomes}
            selectedOutcome={null}
            setSelectedOutcome={() => null}
            orderType={BUY}
            nonSelectable
            editable={mustSetPrices && !hasInitialOdds}
            setEditableValue={(price, index) => setPrices(price, index)}
            ammCash={cash}
            dontFilterInvalid
            hasLiquidity={!mustSetPrices || hasInitialOdds}
            marketFactoryType={market?.marketFactoryType}
            isFutures={market?.isFuture}
          />
        </div>

        <div className={Styles.ActionButtons}>
          {!isApproved && (
            <ApprovalButton
              amm={amm}
              cash={cash}
              actionType={approvalActionType}
              customClass={ButtonStyles.ReviewTransactionButton}
            />
          )}
          <SecondaryThemeButton
            action={() =>
              setModal({
                type: MODAL_CONFIRM_TRANSACTION,
                title: isRemove ? "Remove Liquidity" : "Add Liquidity",
                transactionButtonText: isRemove ? "Remove" : "Add",
                transactionAction: () =>
                  confirmAction({
                    addTransaction,
                    breakdown,
                    setBreakdown,
                    account,
                    loginAccount,
                    market,
                    amount,
                    onChainFee,
                    outcomes,
                    cash,
                    amm,
                    isRemove,
                    estimatedLpAmount,
                    afterSigningAction: BackToLPPageAction,
                  }),
                targetDescription: {
                  market,
                  label: "Pool",
                },
                footer: isRemove
                  ? {
                      text: REMOVE_FOOTER_TEXT,
                    }
                  : null,
                breakdowns: isRemove
                  ? [
                      {
                        heading: "What you are removing:",
                        infoNumbers: [
                          {
                            label: "Pooled USDC",
                            value: `${formatCash(breakdown.amount, USDC).full}`,
                            svg: USDCIcon,
                          },
                        ],
                      },
                      {
                        heading: "What you'll recieve",
                        infoNumbers,
                      },
                    ]
                  : [
                      {
                        heading: "What you are depositing",
                        infoNumbers: [
                          {
                            label: "amount",
                            value: `${formatCash(amount, USDC).formatted} USDC`,
                          },
                        ],
                      },
                      {
                        heading: "What you'll recieve",
                        infoNumbers,
                      },
                      {
                        heading: "Pool Details",
                        infoNumbers: [
                          {
                            label: "Trading Fee",
                            value: `${amm?.feeInPercent}%`,
                          },
                        ],
                      },
                    ],
              })
            }
            disabled={!isApproved || inputFormError !== ""}
            error={buttonError}
            text={inputFormError === "" ? (buttonError ? buttonError : actionButtonText) : inputFormError}
            subText={
              buttonError === INVALID_PRICE
                ? lessThanMinPrice
                  ? INVALID_PRICE_GREATER_THAN_SUBTEXT
                  : INVALID_PRICE_ADD_UP_SUBTEXT
                : null
            }
            customClass={ButtonStyles.ReviewTransactionButton}
          />
        </div>
      </main>
    </section>
  );
};

export default MarketLiquidityView;

const confirmAction = async ({
  addTransaction,
  breakdown,
  setBreakdown,
  account,
  loginAccount,
  market,
  amount,
  onChainFee,
  outcomes,
  cash,
  amm,
  isRemove,
  estimatedLpAmount,
  afterSigningAction = () => {},
}) => {
  const valid = checkConvertLiquidityProperties(account, market.marketId, amount, onChainFee, outcomes, cash, amm);
  if (!valid) {
    setBreakdown(defaultAddLiquidityBreakdown);
  }
  if (isRemove) {
    doRemoveLiquidity(amm, loginAccount?.library, amount, breakdown.minAmountsRaw, account, cash, market?.hasWinner)
      .then((response) => {
        const { hash } = response;
        addTransaction({
          hash,
          chainId: loginAccount.chainId,
          seen: false,
          status: TX_STATUS.PENDING,
          from: account,
          addedTime: new Date().getTime(),
          message: `Remove Liquidity`,
          marketDescription: `${market?.title} ${market?.description}`,
        });
        afterSigningAction();
      })
      .catch((error) => {
        console.log("Error when trying to remove AMM liquidity: ", error?.message);
        addTransaction({
          hash: "remove-liquidity-failed",
          chainId: loginAccount.chainId,
          seen: false,
          status: TX_STATUS.FAILURE,
          from: account,
          addedTime: new Date().getTime(),
          message: `Remove Liquidity`,
          marketDescription: `${market?.title} ${market?.description}`,
        });
      });
  } else {
    await addLiquidityPool(
      account,
      loginAccount?.library,
      amm,
      cash,
      amount,
      estimatedLpAmount,
      unOrderOutcomesForDisplay(outcomes)
    )
      .then((response) => {
        const { hash } = response;
        addTransaction({
          hash,
          chainId: loginAccount.chainId,
          from: account,
          seen: false,
          status: TX_STATUS.PENDING,
          addedTime: new Date().getTime(),
          message: `Add Liquidity`,
          marketDescription: `${market?.title} ${market?.description}`,
        });
        afterSigningAction();
      })
      .catch((error) => {
        console.log("Error when trying to add AMM liquidity: ", error?.message);
        addTransaction({
          hash: `add-liquidity-failed${Date.now()}`,
          chainId: loginAccount.chainId,
          from: account,
          seen: false,
          status: TX_STATUS.FAILURE,
          addedTime: new Date().getTime(),
          message: `Add Liquidity`,
          marketDescription: `${market?.title} ${market?.description}`,
        });
      });
  }
};

const useErrorValidation = ({ isRemove, outcomes, amount, actionType, isFuture, userMaxAmount, account }) => {
  let buttonError = "";
  let inputFormError = "";
  let lessThanMinPrice = false;
  const priceErrors = isRemove
    ? []
    : outcomes.filter((outcome) => {
        return parseFloat(outcome.price) >= 1 || isInvalidNumber(outcome.price);
      });
  const hasPriceErrors = priceErrors.length > 0;
  const hasAmountErrors = isInvalidNumber(amount);
  if (hasAmountErrors) {
    buttonError = ERROR_AMOUNT;
  } else if (hasPriceErrors) {
    buttonError = "Price is not valid";
  }
  if (!account) inputFormError = CONNECT_ACCOUNT;
  else if (!amount || amount === "0" || amount === "") inputFormError = ENTER_AMOUNT;
  else if (new BN(amount).gt(new BN(userMaxAmount))) inputFormError = INSUFFICIENT_BALANCE;
  else if (actionType === CREATE) {
    let totalPrice = ZERO;
    outcomes.forEach((outcome) => {
      const price = outcome.price;
      if (price === "0" || !price) {
        inputFormError = SET_PRICES;
      } else if (createBigNumber(price).lt(createBigNumber(MIN_PRICE))) {
        buttonError = INVALID_PRICE;
        lessThanMinPrice = true;
      } else {
        totalPrice = totalPrice.plus(createBigNumber(price));
      }
    });
    if (inputFormError === "" && !totalPrice.eq(ONE) && !isFuture) {
      buttonError = INVALID_PRICE;
    }
    const minimumAmount = "100";
    if (amount) {
      if (new BN(amount).lt(new BN(minimumAmount))) buttonError = `$${minimumAmount} Minimum deposit`;
    }
  }

  return {
    buttonError,
    inputFormError,
    lessThanMinPrice,
    hasAmountErrors,
  };
};
