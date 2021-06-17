import React, { useEffect, useRef, useState } from "react";
import classNames from "classnames";
import { EthIcon, UsdIcon, XIcon, MagnifyingGlass } from "./icons";
import Styles from "./inputs.styles.less";
import { getCashFormat, formatCash, formatSimpleShares, formatCashPrice } from "../../utils/format-number";
import { USDC, ERROR_AMOUNT, SHARES, ETH, DUST_POSITION_AMOUNT } from "../../utils/constants";
import { useAppStatusStore } from "../../stores/app-status";
import { TinyButton } from "./buttons";
import { CurrencyDropdown } from "./selection";
import { AmmOutcome, Cash } from "../../types";
import { BigNumber as BN } from "bignumber.js";
import { orderOutcomesForDisplay } from "../market-card/market-card";

const ENTER_CHAR_CODE = 13;

export interface SearchInputProps {
  value: string;
  onChange: React.ChangeEventHandler;
  clearValue: React.MouseEventHandler;
  showFilter?: boolean;
}

export const SearchInput = ({ value, onChange, clearValue, showFilter }: SearchInputProps) => {
  const input = useRef(null);

  useEffect(() => {
    if (showFilter) input?.current?.focus();
  }, [showFilter]);

  const keypressHandler = (e) => {
    if (e.charCode === ENTER_CHAR_CODE) {
      input.current && input.current.blur();
    }
  };

  return (
    <div className={Styles.SearchInput}>
      {MagnifyingGlass}
      <input
        ref={input}
        placeholder="Search for a market"
        value={value}
        onChange={onChange}
        onKeyPress={(event) => keypressHandler(event)}
      />
      <div className={classNames({ [Styles.faded]: !value })} onClick={clearValue}>
        {XIcon}
      </div>
    </div>
  );
};

export const TextInput = ({ placeholder, value, onChange }) => {
  return (
    <input
      className={Styles.TextInput}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
};

export interface AmountInputProps {
  updateInitialAmount: (string) => void;
  initialAmount: string;
  maxValue: string;
  showCurrencyDropdown?: boolean;
  updateCash?: (string) => void;
  chosenCash: string;
  rate?: React.Fragment | null;
  error?: boolean;
  updateAmountError?: Function;
  ammCash: Cash;
  isBuy?: boolean;
  disabled?: boolean;
}

export const AmountInput = ({
  updateInitialAmount,
  initialAmount,
  maxValue,
  showCurrencyDropdown,
  updateCash,
  chosenCash,
  rate,
  ammCash,
  updateAmountError = () => {},
  isBuy = true,
  error,
  disabled = false,
}: AmountInputProps) => {
  const { isLogged } = useAppStatusStore();
  const currencyName = chosenCash;
  const [amount, updateAmount] = useState(initialAmount);
  const icon = currencyName === USDC ? UsdIcon : EthIcon;
  const label = currencyName === USDC ? USDC : ETH;
  const { symbol, prepend } = getCashFormat(chosenCash);
  const setMax = () => {
    if (new BN(maxValue).lte(DUST_POSITION_AMOUNT)) return;
    updateAmount(maxValue);
    updateInitialAmount(maxValue);
  };
  const errorCheck = (value) => {
    let returnError = "";
    if (value !== "" && (isNaN(value) || Number(value) === 0 || Number(value) < 0)) {
      returnError = ERROR_AMOUNT;
    }
    updateAmountError(returnError);
  };
  useEffect(() => updateAmount(initialAmount), [initialAmount]);
  useEffect(() => errorCheck(amount), [amount, maxValue]);
  return (
    <div
      className={classNames(Styles.AmountInput, {
        [Styles.Rate]: Boolean(rate),
      })}
    >
      <span>amount</span>
      <span onClick={setMax}>
        {isLogged && (
          <>
            <span>balance:</span>{" "}
            {isBuy ? formatCash(maxValue, ammCash?.name).full : formatSimpleShares(maxValue).roundedFormatted}
          </>
        )}
      </span>
      <div
        className={classNames(Styles.AmountInputField, {
          [Styles.Edited]: amount !== "",
          [Styles.showCurrencyDropdown]: showCurrencyDropdown,
          [Styles.Error]: error,
        })}
      >
        <span>{chosenCash !== SHARES && prepend && symbol}</span>
        <input
          type="number"
          onChange={(e) => {
            updateAmount(e.target.value);
            updateInitialAmount(e.target.value);
            errorCheck(e.target.value);
          }}
          title={disabled ? "Liquidity Depleted" : "enter amount"}
          value={amount}
          placeholder="0"
          disabled={disabled}
          onWheel={(e: any) => e?.target?.blur()}
        />
        <TinyButton text="Max" action={() => setMax()} />
        {!!currencyName && chosenCash !== SHARES && !showCurrencyDropdown && (
          <span className={Styles.CurrencyLabel}>
            {icon} {label}
          </span>
        )}
        {chosenCash === SHARES && !showCurrencyDropdown && <span className={Styles.SharesLabel}>Shares</span>}
        {showCurrencyDropdown && <CurrencyDropdown defaultValue={chosenCash} onChange={(cash) => updateCash(cash)} />}
      </div>
      <span className={Styles.RateLabel}>
        <span>Rate:</span>
        {rate}
      </span>
    </div>
  );
};

const PLACEHOLDER = "00";

export const isInvalidNumber = (number) => {
  return number !== "" && (isNaN(number) || Number(number) < 0 || Number(number) === 0);
};

const Outcome = ({
  outcome,
  selected,
  onClick,
  showAllHighlighted,
  nonSelectable,
  editable,
  setEditableValue,
  ammCash,
  showAsButton,
  error,
  noClick,
  index,
  hasLiquidity,
}: typeof React.Component) => {
  const [customVal, setCustomVal] = useState("");
  const input = useRef(null);
  const { isLogged } = useAppStatusStore();
  const { prepend, symbol } = getCashFormat(ammCash?.name);
  useEffect(() => {
    if (outcome.price !== "0" && outcome.price && outcome.price !== "") {
      let numInput = outcome.price.split(".");
      numInput.shift();
      setCustomVal(numInput.join("."));
    }
  }, [outcome.price]);
  const price = !!hasLiquidity
    ? formatCashPrice(outcome?.price, ammCash?.name).full
    : prepend
    ? `${symbol}-`
    : `- ${symbol}`;

  return (
    <div
      key={index}
      onClick={onClick}
      className={classNames(Styles.Outcome, `${Styles[`color-${outcome.id + 1}`]}`, {
        [Styles.Selected]: selected,
        [Styles.ShowAllHighlighted]: showAllHighlighted,
        [Styles.nonSelectable]: nonSelectable,
        [Styles.Edited]: customVal !== "",
        [Styles.showAsButton]: showAsButton,
        [Styles.loggedOut]: !isLogged,
        [Styles.disabled]: !isLogged,
        [Styles.Error]: error,
        [Styles.noClick]: noClick,
        [Styles.Editable]: editable,
      })}
    >
      <span>{outcome.name}</span>
      {editable ? (
        <div onClick={() => input.current && input.current.focus()}>
          <span>{`${prepend && symbol}0.`}</span>
          <input
            value={customVal}
            onChange={(v) => {
              setCustomVal(`${v.target.value}`);
              setEditableValue(v.target.value && v.target.value !== "0" ? `.${v.target.value}` : `${v.target.value}`);
            }}
            type="text"
            placeholder={PLACEHOLDER}
            ref={input}
            onWheel={(e: any) => e?.target?.blur()}
          />
        </div>
      ) : (
        <span>{price}</span>
      )}
    </div>
  );
};

export interface OutcomesGridProps {
  outcomes: AmmOutcome[];
  selectedOutcome?: AmmOutcome;
  setSelectedOutcome: Function;
  marketType: string;
  orderType?: string;
  showAllHighlighted?: boolean;
  nonSelectable?: boolean;
  editable?: boolean;
  setEditableValue?: Function;
  ammCash: Cash;
  showAsButtons?: boolean;
  dontFilterInvalid?: boolean;
  error?: boolean;
  noClick?: boolean;
  hasLiquidity?: boolean;
  marketFactoryType?: string;
}
export const OutcomesGrid = ({
  outcomes,
  selectedOutcome,
  setSelectedOutcome,
  showAllHighlighted,
  nonSelectable,
  editable,
  setEditableValue,
  ammCash,
  showAsButtons,
  dontFilterInvalid,
  error,
  noClick,
  hasLiquidity,
  marketFactoryType
}: OutcomesGridProps) => {
  const sortedOutcomes = orderOutcomesForDisplay(outcomes, marketFactoryType);
  return (
    <div
      className={classNames(Styles.Outcomes, {
        [Styles.nonSelectable]: nonSelectable,
        [Styles.showAsButtons]: showAsButtons,
        [Styles.noClick]: noClick,
      })}
    >
      {sortedOutcomes
        .filter((outcome) => (dontFilterInvalid ? true : !outcome?.isInvalid))
        .map((outcome, index) => (
          <Outcome
            key={`outcome-${outcome.id}`}
            index={outcome.id}
            selected={selectedOutcome && outcome.id === selectedOutcome?.id && !showAllHighlighted}
            nonSelectable={nonSelectable}
            showAllHighlighted={showAllHighlighted}
            outcome={outcome}
            onClick={() => setSelectedOutcome(outcome)}
            editable={editable}
            setEditableValue={(price) => setEditableValue(price, index)}
            ammCash={ammCash}
            showAsButton={showAsButtons}
            error={error}
            noClick={noClick}
            hasLiquidity={hasLiquidity}
          />
        ))}
    </div>
  );
};
