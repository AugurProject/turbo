import React, { useEffect, useMemo, useState } from "react";
import Styles from "./modal.styles.less";
import ButtonStyles from "../common/buttons.styles.less";
import { Header } from "./common";
import { useHistory } from "react-router";
import { InfoNumbers, ApprovalButton } from "../market/trading-form";
import classNames from "classnames";
import { AmmOutcome, Cash, LiquidityBreakdown, MarketInfo, DataState } from "@augurproject/comps/build/types";
import { BigNumber as BN } from "bignumber.js";
import {
  ContractCalls,
  Calculations,
  createBigNumber,
  useAppStatusStore,
  useDataStore,
  useUserStore,
  useApprovalStatus,
  Formatter,
  Constants,
  Components,
} from "@augurproject/comps";
import { MaticIcon } from "@augurproject/comps/build/components/common/icons";
const {
  checkConvertLiquidityProperties,
  doRemoveLiquidity,
  addLiquidityPool,
  estimateAddLiquidityPool,
  getRemoveLiquidity,
} = ContractCalls;
const {
  calcPricesFromOdds
} = Calculations;
const { formatPercent, formatSimpleShares, formatEther } = Formatter;
const {
  Icons: { BackIcon },
  ButtonComps: { SecondaryThemeButton },
  SelectionComps: { MultiButtonSelection },
  InputComps: { AmountInput, isInvalidNumber, OutcomesGrid },
  LabelComps: { generateTooltip, WarningBanner },
  MarketCardComps: { MarketTitleArea, orderOutcomesForDisplay, unOrderOutcomesForDisplay },
} = Components;
const {
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

const orderMinAmountsForDisplay = (
  items: { amount: string; outcomeId: number; hide: boolean }[] = []
): { amount: string; outcomeId: number; hide: boolean }[] =>
  items.length > 0 && items[0].outcomeId === 0 ? items.slice(1).concat(items.slice(0, 1)) : items;

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
  const { cashes, ammExchanges, blocknumber }: DataState = useDataStore();
  const history = useHistory();

  let amm = ammExchanges[market.marketId];
  const mustSetPrices = Boolean(!amm?.id);
  const modalType = liquidityModalType !== REMOVE ? (Boolean(amm?.id) ? ADD : CREATE) : REMOVE;
  const hasInitialOdds = market?.initialOdds && market?.initialOdds?.length && mustSetPrices;
  const initialOutcomes = hasInitialOdds
    ? calcPricesFromOdds(market?.initialOdds, amm?.ammOutcomes)
    : amm?.ammOutcomes || [];

  const [outcomes, setOutcomes] = useState<AmmOutcome[]>(orderOutcomesForDisplay(initialOutcomes));
  // const [showBackView, setShowBackView] = useState(false);
  const [page, setPage] = useState(0);
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

  let buttonError = "";
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

  const getCreateBreakdown = (isRemove = false) => {
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

  const confirmAction = async () => {
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
    closeModal();
  };

  const totalPrice = outcomes.reduce((p, outcome) => (outcome.price === "" ? parseFloat(outcome.price) + p : p), 0);

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
  }, [account, amount, tradingFeeSelection, cash, isApproved, buttonError, totalPrice, isRemove]);

  const LIQUIDITY_STRINGS = {
    [REMOVE]: [
      {
        header: "remove all liquidity",
        showTradingFee: false,
        cantEditAmount: true,
        hideCurrentOdds: true,
        receiveTitle: "What you will recieve",
        approvalButtonText: "approve shares spend",
        actionButtonText: "Remove all liquidity",
        actionButtonAction: () => setPage(1),
        currencyName: SHARES,
        footerText: `Removing liquidity may return shares; these shares may be sold for USDC if there is still liquidity in the pool. Winning shares can be redeemed for USDC after the market has finalized.`,
        breakdown: getCreateBreakdown(true),
        needsApproval: true,
        showBreakdown: true,
        liquidityDetails: {
          title: "Market Liquidity Details",
          breakdown: [
            {
              label: "Trading fee",
              value: `${feePercentFormatted}`,
            },
            {
              label: "your share of the liquidity pool",
              value: `${breakdown?.poolPct ? formatPercent(breakdown?.poolPct).full : "-"}`,
            },
          ],
        },
      },
      {
        header: "Back", // uses back button
        hasBackButton: true,
        backButtonAction: () => setPage(page - 1),
        actionButtonText: "confirm remove",
        actionButtonAction: confirmAction,
        showMarketTitle: true,
        confirmOverview: {
          title: "What you are Removing",
          breakdown: [
            {
              label: "Your Share of the Liquidity Pool",
              value: `${formatPercent(breakdown?.poolPct).full}`,
            },
          ],
        },
        confirmReceiveOverview: {
          title: "What you will recieve",
          breakdown: getCreateBreakdown(true),
        },
      },
    ],
    [ADD]: [
      {
        header: "add liquidity",
        showTradingFee: true,
        setOdds: true,
        setOddsTitle: mustSetPrices
          ? "Set the price (between 0.02 - 0.1). Total price of all outcomes must add up to 1."
          : "Current Prices",
        receiveTitle: "You'll receive",
        actionButtonAction: () => setPage(1),
        actionButtonText: "Add",
        footerText: `By adding liquidity you'll earn ${feePercentFormatted} of all trades on this market proportional to your share of the pool. Fees are added to the pool, accrue in real time and can be claimed by withdrawing your liquidity.`,
        footerEmphasize: `Remove liquidity before the winning outcome is known to prevent any loss of funds.`,
        breakdown: getCreateBreakdown(),
        needsApproval: true,
        hasAmountInput: true,
        displayOutcomes: true,
        showBreakdown: true,
        currencyName: `${chosenCash}`,
      },
      {
        header: "Back", // uses back button
        hasBackButton: true,
        backButtonAction: () => setPage(page - 1),
        actionButtonText: "confirm add",
        actionButtonAction: confirmAction,
        showMarketTitle: true,
        showConfirmWarning: true,
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
              value: `${formatPercent(breakdown.poolPct).full}`,
            },
          ],
        },
      },
    ],
    [CREATE]: [
      {
        header: "add liquidity",
        showTradingFee: false,
        hasBackButton: false,
        setFees: false, // set false for version 0
        setOddsTitle: "Set the price (between 0.02 to 1.0)",
        receiveTitle: "You'll receive",
        breakdown: getCreateBreakdown(),
        actionButtonAction: () => setPage(1),
        actionButtonText: "Add",
        minimumAmount: "100",
        footerText: `By adding initial liquidity you'll earn your set trading fee percentage of all trades on this market proportional to your share of the pool. Fees are added to the pool, accrue in real time and can be claimed by withdrawing your liquidity.`,
        footerEmphasize: `Remove liquidity before the winning outcome is known to prevent any loss of funds.`,
        currencyName: `${chosenCash}`,
        hasAmountInput: true,
        displayOutcomes: true,
        showBreakdown: true,
        needsApproval: true,
      },
      {
        header: "Back", // uses back button
        hasBackButton: true,
        backButtonAction: () => setPage(page - 1),
        actionButtonText: "Confirm Market Liquidity",
        actionButtonAction: confirmAction,
        showMarketTitle: true,
        showConfirmWarning: true,
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
              value: `100%`,
            },
          ],
        },
      },
    ],
  };

  const curPage: any = LIQUIDITY_STRINGS[modalType]?.[page];

  if (curPage.minimumAmount && amount) {
    if (new BN(amount).lt(new BN(curPage.minimumAmount))) buttonError = `$${curPage.minimumAmount} Minimum deposit`;
  }

  const setPrices = (price, index) => {
    const newOutcomes = outcomes;
    newOutcomes[index].price = price;
    setOutcomes([...newOutcomes]);
  };

  return (
    <section
      className={classNames(Styles.ModalAddLiquidity, {
        [Styles.showBackView]: curPage.hasBackButton,
        [Styles.Remove]: isRemove,
      })}
    >
      {curPage.hasBackButton ? (
        <div className={Styles.Header} onClick={curPage.backButtonAction}>
          {BackIcon}
          {curPage.header}
        </div>
      ) : (
        <Header
          title={curPage.header}
          subtitle={{
            label: "trading fee",
            value: curPage.showTradingFee ? feePercentFormatted : null,
          }}
        />
      )}
      <main>
        {curPage.showMarketTitle && (
          <div className={Styles.MarketTitle}>
            <span>Market</span>
            <MarketTitleArea {...{ ...market }} />
          </div>
        )}
        {curPage.hasAmountInput && !curPage.cantEditAmount && (
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
        )}
        {curPage.setFees && (
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
        {curPage.displayOutcomes && !curPage.hideCurrentOdds && (
          <>
            <span className={Styles.SmallLabel}>{curPage.setOddsTitle}</span>
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
            />
          </>
        )}
        {curPage.liquidityDetails && (
          <div className={Styles.LineBreak}>
            <span className={Styles.SmallLabel}>{curPage.liquidityDetails.title}</span>
            <InfoNumbers infoNumbers={curPage.liquidityDetails.breakdown} />
          </div>
        )}
        {curPage.receiveTitle && <span className={Styles.SmallLabel}>{curPage.receiveTitle}</span>}
        {curPage.showBreakdown && (
          <InfoNumbers
            unedited={JSON.stringify(breakdown) === JSON.stringify(defaultAddLiquidityBreakdown)}
            infoNumbers={curPage.breakdown}
          />
        )}
        {curPage.confirmOverview && (
          <section>
            <span className={Styles.SmallLabel}>{curPage.confirmOverview.title}</span>
            <InfoNumbers infoNumbers={curPage.confirmOverview.breakdown} />
          </section>
        )}

        {curPage.confirmReceiveOverview && (
          <section>
            <span className={Styles.SmallLabel}>{curPage.confirmReceiveOverview.title}</span>
            <InfoNumbers infoNumbers={curPage.confirmReceiveOverview.breakdown} />
          </section>
        )}

        {curPage.marketLiquidityDetails && (
          <section>
            <span className={Styles.SmallLabel}>{curPage.marketLiquidityDetails.title}</span>
            <InfoNumbers infoNumbers={curPage.marketLiquidityDetails.breakdown} />
          </section>
        )}
        {curPage.needsApproval && !isApproved && (
          <ApprovalButton
            amm={amm}
            cash={cash}
            actionType={!isRemove ? ApprovalAction.ADD_LIQUIDITY : ApprovalAction.REMOVE_LIQUIDITY}
          />
        )}
        {curPage.showConfirmWarning && (
          <WarningBanner
            className={Styles.MarginTop}
            title="Remove liquidity before winning outcome is known to prevent loss of funds."
            subtitle={
              "Impermanent loss occurs when you provide liquidity to a liquidity pool, and the price of your deposited assets changes compared to when you deposited them. The bigger this change is, the more exposed you are to impermanent loss. To mitigate this risk, it is recommended that you remove your liquidity before the final outcome is known."
            }
          />
        )}
        <SecondaryThemeButton
          action={curPage.actionButtonAction}
          disabled={!isApproved || inputFormError !== ""}
          error={buttonError}
          text={inputFormError === "" ? (buttonError ? buttonError : curPage.actionButtonText) : inputFormError}
          subText={
            buttonError === INVALID_PRICE
              ? lessThanMinPrice
                ? INVALID_PRICE_GREATER_THAN_SUBTEXT
                : INVALID_PRICE_ADD_UP_SUBTEXT
              : null
          }
          customClass={ButtonStyles.BuySellButton}
        />
        {curPage.footerText && (
          <div className={Styles.FooterText}>
            {curPage.footerText}
            {curPage.footerEmphasize && <span>{curPage.footerEmphasize}</span>}
          </div>
        )}
      </main>
    </section>
  );
};

export default ModalAddLiquidity;
