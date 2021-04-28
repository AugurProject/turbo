// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import Styles from "./modal.styles.less";
import { Header } from "./common";
import { useHistory } from "react-router";
import { InfoNumbers } from "../market/trading-form";
import classNames from "classnames";
import { AmmOutcome, Cash, LiquidityBreakdown, MarketInfo } from "../types";
import { BigNumber as BN } from "bignumber.js";
import {
  ContractCalls,
  createBigNumber,
  useAppStatusStore,
  useDataStore,
  useUserStore,
  useApprovalStatus,
  Formatter,
  Constants,
  Components,
} from "@augurproject/comps";
const {
  checkConvertLiquidityProperties,
  doRemoveLiquidity,
  addLiquidityPool,
  estimateAddLiquidityPool,
  getRemoveLiquidity,
} = ContractCalls;
const {
  formatPercent,
  lpTokensOnChainToDisplay,
  formatSimpleShares,
} = Formatter;
const {
  Icons: { BackIcon },
  ButtonComps: { ApprovalButton, BuySellButton },
  SelectionComps: { MultiButtonSelection },
  InputComps: { AmountInput, isInvalidNumber, OutcomesGrid },
  LabelComps: { generateTooltip },
  MarketCardComps: { MarketTitleArea, orderOutcomesForDisplay },
} = Components;
const {
  YES_NO,
  BUY,
  USDC,
  SHARES,
  MARKETS,
  ApprovalAction,
  ENTER_AMOUNT,
  CREATE,
  ADD,
  REMOVE,
  CONNECT_ACCOUNT,
  SET_PRICES,
  TX_STATUS,
  INVALID_PRICE,
  INSUFFICIENT_BALANCE,
  ERROR_AMOUNT,
  INVALID_PRICE_ADD_UP_SUBTEXT,
  INVALID_PRICE_GREATER_THAN_SUBTEXT,
  ApprovalState,
  ZERO,
  ONE,
} = Constants;

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

const defaultAddLiquidityBreakdown: LiquidityBreakdown = {
  lpTokens: "0",
  cashAmount: "0",
  minAmounts: [],
};

interface ModalAddLiquidityProps {
  market: MarketInfo;
  liquidityModalType: string;
  currency?: string;
}

const ModalAddLiquidity = ({ market, liquidityModalType, currency }: ModalAddLiquidityProps) => {
  const {
    actions: { closeModal },
  } = useAppStatusStore();
  const {
    account,
    balances,
    loginAccount,
    actions: { addTransaction },
  } = useUserStore();
  const { cashes, ammExchanges, blocknumber } = useDataStore();
  const history = useHistory();

  let amm = ammExchanges[market.marketId];
  const mustSetPrices = Boolean(!amm?.id);
  const modalType = liquidityModalType !== REMOVE ? (Boolean(amm?.id) ? ADD : CREATE) : REMOVE;

  const [outcomes, setOutcomes] = useState<AmmOutcome[]>(amm.ammOutcomes);
  const [showBackView, setShowBackView] = useState(false);
  const [chosenCash, updateCash] = useState<string>(currency ? currency : USDC);
  const [breakdown, setBreakdown] = useState(defaultAddLiquidityBreakdown);
  const [estimatedLpAmount, setEstimatedLpAmount] = useState<string>("0");
  const [tradingFeeSelection, setTradingFeeSelection] = useState<number>(TRADING_FEE_OPTIONS[2].id);

  const cash: Cash = useMemo(() => {
    return cashes && chosenCash ? Object.values(cashes).find((c) => c.name === chosenCash) : Object.values(cashes)[0];
  }, [chosenCash]);
  const isRemove = modalType === REMOVE;
  const approvedToTransfer = ApprovalState.APPROVED;
  const isApprovedToTransfer = approvedToTransfer === ApprovalState.APPROVED;
  const approvedMain = useApprovalStatus({
    cash,
    amm,
    refresh: blocknumber,
    actionType: !isRemove ? ApprovalAction.ADD_LIQUIDITY : ApprovalAction.REMOVE_LIQUIDITY,
  });
  const isApprovedMain = approvedMain === ApprovalState.APPROVED;
  const isApproved = isRemove ? isApprovedMain && isApprovedToTransfer : isApprovedMain;
  const userTokenBalance = cash?.name ? balances[cash?.name]?.balance : "0";
  const shareBalance =
    balances && balances.lpTokens && balances.lpTokens[amm?.marketId] && balances.lpTokens[amm?.marketId].balance;
  const userMaxAmount = isRemove ? shareBalance : userTokenBalance;

  const [amount, updateAmount] = useState(isRemove ? userMaxAmount : "");

  const feePercentFormatted = useMemo(() => {
    return formatPercent(amm?.feeInPercent).full;
  }, [amm?.feeInPercent]);

  const onChainFee = useMemo(() => {
    const feeOption = TRADING_FEE_OPTIONS.find((t) => t.id === tradingFeeSelection);
    const feePercent = modalType === CREATE ? feeOption.value : amm?.feeInPercent;

    return String(new BN(feePercent).times(new BN(10)));
  }, [tradingFeeSelection, amm?.feeRaw]);

  const userPercentOfPool = useMemo(() => {
    let userPercent = "100";
    const rawSupply = amm?.totalSupply;
    if (rawSupply) {
      if (modalType === ADD) {
        const displaySupply = lpTokensOnChainToDisplay(rawSupply);
        userPercent = String(
          new BN(estimatedLpAmount)
            .plus(new BN(shareBalance || "0"))
            .div(new BN(displaySupply).plus(new BN(estimatedLpAmount)))
            .times(new BN(100))
            .abs()          
        );
      } else if (isRemove) {
        const userBalanceLpTokens = balances?.lpTokens[amm?.marketId];
        const userAmount = userBalanceLpTokens?.rawBalance || "0";
        userPercent = String(
          new BN(userAmount).dividedBy(rawSupply).times(100).abs()
        );
      }
    }
    return formatPercent(userPercent).full;
  }, [amm?.totalSupply, amount, balances, shareBalance, estimatedLpAmount, amm?.id, cash?.decimals, modalType]);

  let buttonError = "";
  const priceErrors = outcomes.filter((outcome) => {
    return parseFloat(outcome.price) >= 1 || isInvalidNumber(outcome.price);
  });
  const hasPriceErrors = priceErrors.length > 0;
  const hasAmountErrors = isInvalidNumber(amount);
  if (hasAmountErrors) {
    buttonError = ERROR_AMOUNT;
  } else if (hasPriceErrors) {
    buttonError = "Price is not valid";
  }
  
  let lessThanMinPrice = false;

  let inputFormError = "";
  if (!account) inputFormError = CONNECT_ACCOUNT;
  else if (!amount || amount === "0" || amount === "") inputFormError = ENTER_AMOUNT;
  else if (new BN(amount).gt(new BN(userMaxAmount))) inputFormError = INSUFFICIENT_BALANCE;
  else if (modalType === CREATE) {
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
    if (inputFormError === "" && !totalPrice.eq(ONE)) {
      buttonError = INVALID_PRICE;
    }
  }

  const getCreateBreakdown = () => {
    const fullBreakdown = [
      {
        label: "LP tokens",
        value: `${formatSimpleShares(breakdown.lpTokens).formatted}`,
      },
    ];

    return fullBreakdown;
  };

  const confirmAction = async () => {
    const valid = checkConvertLiquidityProperties(account, market.marketId, amount, onChainFee, outcomes, cash, amm);
    if (!valid) {
      setBreakdown(defaultAddLiquidityBreakdown);
    }
    if (isRemove) {
      doRemoveLiquidity(amm.id, loginAccount?.library, amount, breakdown.minAmountsRaw, account, cash)
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
            marketDescription: market.description,
          });
        })
        .catch((error) => {
          console.log("Error when trying to remove AMM liquidity: ", error?.message);
        });
    } else {
      await addLiquidityPool(account, loginAccount?.library, amm, cash, amount, estimatedLpAmount, outcomes)
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
            marketDescription: market.description,
          });
        })
        .catch((error) => {
          console.log("Error when trying to add AMM liquidity: ", error?.message);
        });
    }
    closeModal();
    if (modalType === CREATE && history.location.pathname !== `/${MARKETS}`) {
      history.push(`/${MARKETS}`);
    }
  };

  const totalPrice = outcomes.reduce(
    (p, outcome) => outcome.price === "" ? parseFloat(outcome.price) + p : p, 0
  );

  useEffect(() => {
    const priceErrorsWithEmptyString = outcomes.filter(
      (outcome) => parseFloat(outcome.price) >= 1 || outcome.price === ""
    );

    if (priceErrorsWithEmptyString.length > 0 || hasAmountErrors) {
      return setBreakdown(defaultAddLiquidityBreakdown);
    }

    const valid = checkConvertLiquidityProperties(account, market.marketId, amount, onChainFee, outcomes, cash, amm);
    if (!valid) {
      return setBreakdown(defaultAddLiquidityBreakdown);
    }
    async function getResults() {
      let results: LiquidityBreakdown;
      if (isRemove) {
        results = await getRemoveLiquidity(amm.id, loginAccount?.library, cash, amount, account, outcomes);
      } else {
        results = await estimateAddLiquidityPool(account, loginAccount?.library, amm, cash, amount, outcomes);
      }

      if (!results) {
        return setBreakdown(defaultAddLiquidityBreakdown);
      }
      setBreakdown(results);
      setEstimatedLpAmount(results.lpTokens);
    }

    if (isApproved && !buttonError)
    getResults();
  }, [account, amount, tradingFeeSelection, cash, isApproved, buttonError, totalPrice]);

  const LIQUIDITY_STRINGS = {
    [REMOVE]: {
      header: "remove all liquidity",
      showTradingFee: false,
      cantEditAmount: true,
      hideCurrentOdds: true,
      receiveTitle: "What you will recieve",
      approvalButtonText: "approve shares spend",
      actionButtonText: "Remove all liquidity",
      confirmButtonText: "confirm remove",
      currencyName: SHARES,
      footerText: `Removing liquidity returns shares; these shares may be sold for ${chosenCash}.`,
      breakdown: breakdown?.minAmounts
        ? breakdown.minAmounts.slice(0, outcomes.length).map((m, i) => ({
            label: `${outcomes[i]?.name} Shares`,
            value: `${formatSimpleShares(breakdown.minAmounts[i]).formatted}`,
          }))
        : [],
      liquidityDetails: {
        title: "Market Liquidity Details",
        breakdown: [
          {
            label: "Trading fee",
            value: `${feePercentFormatted}`,
          },
          {
            label: "your share of the liquidity pool",
            value: `${userPercentOfPool}`,
          },
        ],
      },
      confirmOverview: {
        title: "What you are Removing",
        breakdown: [
          {
            label: "LP tokens",
            value: `${amount}`,
          },
        ],
      },
      confirmReceiveOverview: {
        title: "What you will recieve",
        breakdown: breakdown?.minAmounts
          ? breakdown.minAmounts.slice(0, outcomes.length).map((m, i) => ({
              label: `${outcomes[i]?.name} Shares`,
              value: `${formatSimpleShares(breakdown.minAmounts[i]).formatted}`,
            }))
          : [],
      },
    },
    [ADD]: {
      header: "add liquidity",
      showTradingFee: true,
      setOdds: true,
      setOddsTitle: mustSetPrices
        ? "Set the price (between 0.02 - 0.1). Total price of all outcomes must add up to 1."
        : "Current Prices",
      receiveTitle: "You'll receive",
      actionButtonText: "Add",
      confirmButtonText: "confirm add",
      footerText: `By adding liquidity you'll earn ${feePercentFormatted} of all trades on this market proportional to your share of the pool. Fees are added to the pool, accrue in real time and can be claimed by withdrawing your liquidity.`,
      breakdown: getCreateBreakdown(),
      approvalButtonText: `approve ${chosenCash}`,
      confirmOverview: {
        title: "What you are depositing",
        breakdown: [
          {
            label: "amount",
            value: `${amount} ${amm?.cash?.name}`,
          },
        ],
      },
      confirmReceiveOverview: {
        title: "What you will receive",
        breakdown: getCreateBreakdown(),
      },
      marketLiquidityDetails: {
        title: "Market liquidity details",
        breakdown: [
          {
            label: "trading fee",
            value: `${feePercentFormatted}`,
          },
          {
            label: "your share of the pool",
            value: `${userPercentOfPool}`,
          },
        ],
      },
      currencyName: `${chosenCash}`,
    },
    [CREATE]: {
      header: "add liquidity",
      showTradingFee: false,
      setOdds: true,
      setOddsTitle: "Set the price (between 0.02 to 1.0)",
      editableOutcomes: true,
      setFees: false, // set false for version 0
      receiveTitle: "You'll receive",
      actionButtonText: "Add",
      confirmButtonText: "confirm market liquidity",
      currencyName: `${chosenCash}`,
      footerText: `By adding initial liquidity you'll earn your set trading fee percentage of all trades on this market proportional to your share of the pool. Fees are added to the pool, accrue in real time and can be claimed by withdrawing your liquidity. `,
      breakdown: getCreateBreakdown(),
      approvalButtonText: `approve ${chosenCash}`,
      confirmOverview: {
        title: "What you are depositing",
        breakdown: [
          {
            label: "amount",
            value: `${amount} ${cash?.name}`,
          },
        ],
      },
      confirmReceiveOverview: {
        title: "What you will receive",

        breakdown: getCreateBreakdown(),
      },
      marketLiquidityDetails: {
        title: "Market liquidity details",

        breakdown: [
          {
            label: "trading fee",
            value: `${feePercentFormatted}`,
          },
          {
            label: "your share of the pool",
            value: `${userPercentOfPool}`,
          },
        ],
      },
    },
  };

  const setPrices = (price, index) => {
    const newOutcomes = outcomes;
    newOutcomes[index].price = price;
    setOutcomes([...newOutcomes]);
  };
  return (
    <section
      className={classNames(Styles.ModalAddLiquidity, {
        [Styles.showBackView]: showBackView,
        [Styles.Remove]: isRemove,
      })}
    >
      {!showBackView ? (
        <>
          <Header
            title={LIQUIDITY_STRINGS[modalType].header}
            subtitle={{
              label: "trading fee",
              value: LIQUIDITY_STRINGS[modalType].showTradingFee ? feePercentFormatted : null,
            }}
          />
          <main>
            {!LIQUIDITY_STRINGS[modalType].cantEditAmount && (
              <>
                {LIQUIDITY_STRINGS[modalType].amountSubtitle && (
                  <span className={Styles.SmallLabel}>{LIQUIDITY_STRINGS[modalType].amountSubtitle}</span>
                )}
                <AmountInput
                  ammCash={cash}
                  updateInitialAmount={(amount) => updateAmount(amount)}
                  initialAmount={amount}
                  maxValue={userMaxAmount}
                  showCurrencyDropdown={!currency}
                  chosenCash={isRemove ? SHARES : chosenCash}
                  updateCash={updateCash}
                  updateAmountError={() => null}
                  error={hasAmountErrors}
                />
              </>
            )}
            {LIQUIDITY_STRINGS[modalType].setFees && (
              <>
                <span className={Styles.SmallLabel}>
                  Set trading fee
                  {generateTooltip("Fees earned for providing liquidity.", "tradingFeeInfo")}
                </span>
                <MultiButtonSelection
                  options={TRADING_FEE_OPTIONS}
                  selection={tradingFeeSelection}
                  setSelection={(id) => setTradingFeeSelection(id)}
                />
              </>
            )}
            {!LIQUIDITY_STRINGS[modalType].hideCurrentOdds && (
              <>
                <span className={Styles.SmallLabel}>{LIQUIDITY_STRINGS[modalType].setOddsTitle}</span>
                <OutcomesGrid
                  outcomes={orderOutcomesForDisplay(outcomes)}
                  selectedOutcome={null}
                  setSelectedOutcome={() => null}
                  marketType={YES_NO}
                  orderType={BUY}
                  nonSelectable
                  editable={mustSetPrices}
                  setEditableValue={(price, index) => setPrices(price, index)}
                  ammCash={cash}
                  dontFilterInvalid
                />
              </>
            )}
            {LIQUIDITY_STRINGS[modalType].liquidityDetails && (
              <div className={Styles.LineBreak}>
                <span className={Styles.SmallLabel}>{LIQUIDITY_STRINGS[modalType].liquidityDetails.title}</span>
                <InfoNumbers infoNumbers={LIQUIDITY_STRINGS[modalType].liquidityDetails.breakdown} />
              </div>
            )}
            <span className={Styles.SmallLabel}>{LIQUIDITY_STRINGS[modalType].receiveTitle}</span>
            <InfoNumbers
              unedited={JSON.stringify(breakdown) === JSON.stringify(defaultAddLiquidityBreakdown)}
              infoNumbers={LIQUIDITY_STRINGS[modalType].breakdown}
            />
            {!isApproved && (
              <>
                <ApprovalButton
                  amm={amm}
                  cash={cash}
                  actionType={!isRemove ? ApprovalAction.ADD_LIQUIDITY : ApprovalAction.REMOVE_LIQUIDITY}
                />
              </>
            )}

            <BuySellButton
              action={() => setShowBackView(true)}
              disabled={!isApproved || inputFormError !== ""}
              error={buttonError}
              text={
                inputFormError === ""
                  ? buttonError
                    ? buttonError
                    : LIQUIDITY_STRINGS[modalType].actionButtonText
                  : inputFormError
              }
              subText={
                buttonError === INVALID_PRICE
                  ? lessThanMinPrice
                    ? INVALID_PRICE_GREATER_THAN_SUBTEXT
                    : INVALID_PRICE_ADD_UP_SUBTEXT
                  : null
              }
            />
            <div className={Styles.FooterText}>{LIQUIDITY_STRINGS[modalType].footerText}</div>
          </main>
        </>
      ) : (
        <>
          <div className={Styles.Header} onClick={() => setShowBackView(false)}>
            {BackIcon}
            Back
          </div>
          <main>
            <div className={Styles.MarketTitle}>
              <span>Market</span>
              <span>
                <MarketTitleArea {...{ ...market }} />
              </span>
            </div>
            <section>
              <span className={Styles.SmallLabel}>{LIQUIDITY_STRINGS[modalType].confirmOverview.title}</span>
              <InfoNumbers infoNumbers={LIQUIDITY_STRINGS[modalType].confirmOverview.breakdown} />
            </section>

            <section>
              <span className={Styles.SmallLabel}>{LIQUIDITY_STRINGS[modalType].confirmReceiveOverview.title}</span>
              <InfoNumbers infoNumbers={LIQUIDITY_STRINGS[modalType].confirmReceiveOverview.breakdown} />
            </section>
            {LIQUIDITY_STRINGS[modalType].marketLiquidityDetails && (
              <section>
                <span className={Styles.SmallLabel}>{LIQUIDITY_STRINGS[modalType].marketLiquidityDetails.title}</span>
                <InfoNumbers infoNumbers={LIQUIDITY_STRINGS[modalType].marketLiquidityDetails.breakdown} />
              </section>
            )}
            <BuySellButton text={LIQUIDITY_STRINGS[modalType].confirmButtonText} action={confirmAction} />
            {LIQUIDITY_STRINGS[modalType].footerText && (
              <div className={Styles.FooterText}>{LIQUIDITY_STRINGS[modalType].footerText}</div>
            )}
          </main>
        </>
      )}
    </section>
  );
};

export default ModalAddLiquidity;
