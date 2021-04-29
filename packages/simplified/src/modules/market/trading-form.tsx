import React, { useEffect, useMemo, useState } from "react";
import Styles from "modules/market/trading-form.styles.less";
import classNames from "classnames";
import { useSimplifiedStore } from "../stores/simplified";
import { BigNumber as BN } from "bignumber.js";
import {
  Formatter,
  Constants,
  ContractCalls,
  useAppStatusStore,
  useUserStore,
  useDataStore,
  Components,
  useApprovalStatus,
} from "@augurproject/comps";
import type { AmmOutcome, Cash, EstimateTradeResult } from "@augurproject/comps/build/types";
import { useTrackedEvents } from "../../utils/tracker";
import { Slippage } from "../common/slippage";
import getUSDC from "../../utils/get-usdc";
const { doTrade, estimateBuyTrade, estimateSellTrade } = ContractCalls;
const {
  Icons: { CloseIcon },
  LabelComps: { generateTooltip },
  InputComps: { AmountInput, OutcomesGrid },
  ButtonComps: { ApprovalButton, BuySellButton },
  MarketCardComps: { orderOutcomesForDisplay },
  BuySellToggleSwitch,
} = Components;
const { formatCash, formatCashPrice, formatPercent, formatSimpleShares } = Formatter;
const {
  ApprovalAction,
  ApprovalState,
  SHARES,
  INSUFFICIENT_LIQUIDITY,
  ENTER_AMOUNT,
  SETTINGS_SLIPPAGE,
  ERROR_AMOUNT,
  TX_STATUS,
  BUY,
  SELL,
  YES_NO,
  TradingDirection,
} = Constants;

const AVG_PRICE_TIP = "The difference between the market price and estimated price due to trade size.";

interface InfoNumber {
  label: string;
  value: string;
  tooltipText?: string;
  tooltipKey?: string;
}

interface InfoNumbersProps {
  infoNumbers: InfoNumber[];
  unedited?: boolean;
}

export const InfoNumbers = ({ infoNumbers, unedited }: InfoNumbersProps) => {
  return (
    <div
      className={classNames(Styles.OrderInfo, {
        [Styles.Populated]: !unedited,
      })}
    >
      {infoNumbers.map((infoNumber) => (
        <div key={infoNumber.label}>
          <span>
            {infoNumber.label}
            {infoNumber.tooltipText &&
              infoNumber.tooltipKey &&
              generateTooltip(infoNumber.tooltipText, infoNumber.tooltipKey)}
          </span>
          <span>{infoNumber.value}</span>
        </div>
      ))}
    </div>
  );
};

const getEnterBreakdown = (breakdown: EstimateTradeResult | null, cash: Cash) => {
  return [
    {
      label: "Average Price",
      value: !isNaN(Number(breakdown?.averagePrice))
        ? formatCashPrice(breakdown?.averagePrice || 0, cash?.name).full
        : "-",
      tooltipText: AVG_PRICE_TIP,
      tooltipKey: "averagePrice",
    },
    {
      label: "Estimated Shares",
      value: !isNaN(Number(breakdown?.outputValue)) ? formatSimpleShares(breakdown?.outputValue || 0).full : "-",
    },
    {
      label: "Max Profit",
      value: !isNaN(Number(breakdown?.maxProfit)) ? formatCash(breakdown?.maxProfit || 0, cash?.name).full : "-",
    },
    {
      label: `Estimated Fees (${cash.name})`,
      value: !isNaN(Number(breakdown?.tradeFees)) ? formatCash(breakdown?.tradeFees || 0, cash?.name).full : "-",
    },
  ];
};

const getExitBreakdown = (breakdown: EstimateTradeResult | null, cash: Cash) => {
  return [
    {
      label: "Average Price",
      value: !isNaN(Number(breakdown?.averagePrice))
        ? formatCashPrice(breakdown?.averagePrice || 0, cash?.name).full
        : "-",
      tooltipText: AVG_PRICE_TIP,
      tooltipKey: "averagePrice",
    },
    {
      label: `Amount You'll Recieve`,
      value: !isNaN(Number(breakdown?.outputValue)) ? formatCash(breakdown?.outputValue || 0, cash?.name).full : "-",
    },
    {
      label: "Remaining Shares",
      value: !isNaN(Number(breakdown?.remainingShares))
        ? formatSimpleShares(breakdown?.remainingShares || 0).full
        : "-",
    },
    {
      label: "Estimated Fees (Shares)",
      value: !isNaN(Number(breakdown?.tradeFees)) ? formatSimpleShares(breakdown?.tradeFees || 0).full : "-",
    },
  ];
};

const formatBreakdown = (isBuy: boolean, breakdown: EstimateTradeResult | null, cash: Cash) =>
  isBuy ? getEnterBreakdown(breakdown, cash) : getExitBreakdown(breakdown, cash);

interface TradingFormProps {
  amm: any;
  marketType?: string;
  initialSelectedOutcome: AmmOutcome | any;
}

interface CanTradeProps {
  disabled: boolean;
  actionText: string;
  subText?: string | null;
}

const TradingForm = ({ initialSelectedOutcome, marketType = YES_NO, amm }: TradingFormProps) => {
  const { isLogged } = useAppStatusStore();
  const { cashes, blocknumber } = useDataStore();
  const {
    showTradingForm,
    actions: { setShowTradingForm },
    settings: { slippage },
  } = useSimplifiedStore();
  const {
    account,
    loginAccount,
    balances,
    actions: { addTransaction },
  } = useUserStore();
  const [orderType, setOrderType] = useState(BUY);
  const [selectedOutcome, setSelectedOutcome] = useState(initialSelectedOutcome);
  const { tradingEstimateEvents, tradingEvents } = useTrackedEvents();
  const [breakdown, setBreakdown] = useState<EstimateTradeResult | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [waitingToSign, setWaitingToSign] = useState(false);
  const ammCash = getUSDC(cashes);
  const outcomes = orderOutcomesForDisplay(amm?.ammOutcomes || []);
  const isBuy = orderType === BUY;
  const approvalAction = isBuy ? ApprovalAction.ENTER_POSITION : ApprovalAction.EXIT_POSITION;
  const outcomeShareToken = selectedOutcome?.shareToken;
  const approvalStatus = useApprovalStatus({
    cash: ammCash,
    amm,
    refresh: blocknumber,
    actionType: approvalAction,
    outcomeShareToken,
  });
  const isApprovedTrade = approvalStatus === ApprovalState.APPROVED;

  const selectedOutcomeId = selectedOutcome?.id;
  const marketShares = balances?.marketShares && balances?.marketShares[amm?.marketId];

  const outcomeSharesRaw = JSON.stringify(marketShares?.outcomeSharesRaw);
  const amountError = amount !== "" && (isNaN(Number(amount)) || Number(amount) === 0 || Number(amount) < 0);
  const buttonError = amountError ? ERROR_AMOUNT : "";

  useEffect(() => {
    let isMounted = true;
    function handleShowTradingForm() {
      if (window.innerWidth >= 1200 && showTradingForm && isMounted) {
        setShowTradingForm(false);
        setAmount("");
      }
    }
    window.addEventListener("resize", handleShowTradingForm);
    isMounted && setShowTradingForm(false);
    return () => {
      isMounted = false;
      window.removeEventListener("resize", handleShowTradingForm);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const getEstimate = async () => {
      const outcomeName = outcomes[selectedOutcomeId]?.name;
      const breakdown = isBuy
        ? await estimateBuyTrade(amm, loginAccount?.library, amount, selectedOutcomeId, ammCash)
        : await estimateSellTrade(
            amm,
            loginAccount?.library,
            amount,
            selectedOutcomeId,
            marketShares
          );

      tradingEstimateEvents(isBuy, outcomeName, ammCash?.name, amount, breakdown?.outputValue || "");

      isMounted && setBreakdown(breakdown);
    };

    if (amount && Number(amount) > 0) {
      getEstimate();
    } else if (breakdown !== null) {
      isMounted && setBreakdown(null);
    }

    return () => {
      isMounted = false;
    };
  }, [orderType, selectedOutcomeId, amount, outcomeSharesRaw, amm?.volumeTotal, amm?.liquidity]);

  const userBalance = String(
    useMemo(() => {
      return isBuy
        ? ammCash?.name
          ? balances[ammCash?.name]?.balance
          : "0"
        : marketShares?.outcomeShares
        ? marketShares?.outcomeShares[selectedOutcomeId]
        : "0";
    }, [orderType, ammCash?.name, amm?.id, selectedOutcomeId, balances])
  );

  const canMakeTrade: CanTradeProps = useMemo(() => {
    let actionText = buttonError || orderType;
    let subText: string | null = null;
    let disabled = false;
    if (!isLogged) {
      actionText = "Connect Wallet";
      disabled = true;
    } else if (!amm.hasLiquidity) {
      actionText = "Liquidity Depleted";
      disabled = true;
    } else if (Number(amount) === 0 || isNaN(Number(amount)) || amount === "") {
      actionText = ENTER_AMOUNT;
      disabled = true;
    } else if (new BN(amount).gt(new BN(userBalance))) {
      actionText = `Insufficient ${isBuy ? ammCash.name : "Share"} Balance`;
      disabled = true;
    } else if (false /* breakdown === null */) {
      // todo: need better way to determine if there is liquidity
      actionText = INSUFFICIENT_LIQUIDITY;
      disabled = true;
    } else if (new BN(slippage || SETTINGS_SLIPPAGE).lt(new BN(breakdown?.slippagePercent))) {
      subText = `(Adjust slippage tolerance to ${Math.ceil(Number(breakdown?.slippagePercent))}%)`;
      disabled = true;
    } else if (waitingToSign) {
      actionText = "Waiting for Confirmation";
      disabled = true;
      subText = "(Confirm the transaction in your wallet)";
    }

    return {
      disabled,
      actionText,
      subText,
    };
  }, [orderType, amount, buttonError, userBalance, breakdown?.slippagePercent, slippage, amm.hasLiquidity, waitingToSign]);

  const makeTrade = () => {
    const minOutput = breakdown?.outputValue;
    const direction = isBuy ? TradingDirection.ENTRY : TradingDirection.EXIT;
    const outcomeName = outcomes[selectedOutcomeId]?.name;
    setWaitingToSign(true);
    setShowTradingForm(false);
    tradingEvents(isBuy, outcomeName, ammCash?.name, amount, minOutput);
    doTrade(direction, loginAccount?.library, amm, minOutput, amount, selectedOutcomeId, account, ammCash)
      .then((response) => {
        if (response) {
          const { hash } = response;
          setAmount("");
          setWaitingToSign(false);
          addTransaction({
            hash,
            chainId: loginAccount.chainId,
            seen: false,
            status: TX_STATUS.PENDING,
            from: loginAccount.account,
            addedTime: new Date().getTime(),
            message: `${direction === TradingDirection.ENTRY ? "Buy" : "Sell"} Shares`,
            marketDescription: amm?.market?.description,
          });
        }
      })
      .catch((error) => {
        setWaitingToSign(false);
        console.log("Error when trying to trade: ", error?.message);
      });
  };

  return (
    <div className={Styles.TradingForm}>
      <div>
        <BuySellToggleSwitch
          toggle={isBuy}
          setToggle={() => {
            if (isBuy) {
              setOrderType(SELL);
            } else {
              setOrderType(BUY);
            }
            setBreakdown(null);
            setAmount("");
          }}
        />
        <div>
          <span>fee</span>
          <span>{formatPercent(amm?.feeInPercent).full}</span>
        </div>
        <div
          onClick={() => {
            setShowTradingForm(false);
            setAmount("");
          }}
        >
          {CloseIcon}
        </div>
      </div>
      <div>
        <OutcomesGrid
          outcomes={outcomes}
          selectedOutcome={selectedOutcome}
          setSelectedOutcome={(outcome) => {
            setSelectedOutcome(outcome);
            setAmount("");
          }}
          marketType={marketType}
          orderType={orderType}
          ammCash={ammCash}
          dontFilterInvalid
        />
        <AmountInput
          chosenCash={isBuy ? ammCash?.name : SHARES}
          updateInitialAmount={setAmount}
          initialAmount={amount}
          error={amountError}
          maxValue={userBalance}
          ammCash={ammCash}
          disabled={!amm.hasLiquidity}
          rate={
            !isNaN(Number(breakdown?.ratePerCash))
              ? `1 ${ammCash?.name} = ${
                  formatSimpleShares(breakdown?.ratePerCash || 0, {
                    denomination: (v) => `${v} Shares`,
                  }).full
                }`
              : null
          }
          isBuy={orderType === BUY}
        />
        <Slippage />
        <InfoNumbers infoNumbers={formatBreakdown(isBuy, breakdown, ammCash)} />
        {isLogged && !isApprovedTrade && (
          <ApprovalButton
            {...{
              amm,
              cash: ammCash,
              actionType: approvalAction,
              isApproved: isApprovedTrade,
              shareToken: outcomeShareToken,
            }}
          />
        )}
        <BuySellButton
          disabled={canMakeTrade.disabled || !isApprovedTrade}
          action={makeTrade}
          text={canMakeTrade.actionText}
          subText={canMakeTrade.subText}
          error={buttonError}
        />
      </div>
    </div>
  );
};

export default TradingForm;
