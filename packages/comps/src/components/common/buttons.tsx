import React, { ReactNode, useState, useCallback, useEffect } from "react";
import Styles from "./buttons.styles.less";
import classNames from "classnames";
import { Arrow, SearchIcon, ViewIcon } from "./icons";
import { Spinner } from "./spinner";
import { ApprovalAction, ApprovalState } from "../../utils/constants";
import { AmmExchange, Cash } from "../../types";
import { useUserStore } from "../../stores/user";
import { approveERC20Contract } from "../../stores/use-approval-callback";

export interface ButtonProps {
  id?: string;
  text?: string;
  subText?: string | null;
  className?: string;
  disabled?: boolean;
  action?: Function;
  icon?: ReactNode;
  selected?: boolean;
  href?: string;
  target?: string;
  rel?: string;
  error?: string;
  title?: string;
  darkTheme?: boolean;
  pending?: boolean;
  key?: string;
  label?: string;
}

const Button = ({
  id,
  text,
  subText,
  className,
  disabled,
  action,
  icon,
  selected,
  href,
  error,
  title,
  target = "_blank",
  rel = "noopener noreferrer",
  pending,
  label,
}: ButtonProps) => {
  return href ? (
    <a
      id={id}
      title={title}
      href={href}
      aria-label={label}
      className={classNames(
        Styles.Button,
        {
          [Styles.TextAndIcon]: text && icon,
          [Styles.Disabled]: disabled,
          [Styles.Selected]: selected,
          [Styles.Error]: error && error !== "",
          [Styles.subText]: subText && subText.length > 0,
        },
        className
      )}
      onClick={(e) => action && action(e)}
      target={target}
      rel={rel}
    >
      {error && error !== "" ? error : text}
      {icon && icon}
      {subText && <span>{subText}</span>}
    </a>
  ) : (
    <button
      id={id}
      title={title}
      aria-label={label}
      className={classNames(
        Styles.Button,
        {
          [Styles.TextAndIcon]: text && icon,
          [Styles.Disabled]: disabled || pending,
          [Styles.Selected]: selected,
          [Styles.Error]: error && error !== "",
          [Styles.subText]: subText && subText.length > 0,
        },
        className
      )}
      onClick={(e) => action && action(e)}
    >
      {pending && <Spinner />}
      {!pending && (error && error !== "" ? error : text)}
      {!pending && icon && icon}
      {!pending && subText && <span>{subText}</span>}
    </button>
  );
};

export const PrimaryButton = (props: ButtonProps) => (
  <Button
    {...props}
    className={classNames(Styles.PrimaryButton, props.className, {
      [Styles.Dark]: props.darkTheme,
    })}
  />
);
export const SecondaryButton = (props: ButtonProps) => (
  <Button {...props} className={classNames(Styles.SecondaryButton, props.className)} />
);
export const TinyButton = (props: ButtonProps) => (
  <Button {...props} className={classNames(Styles.TinyButton, props.className)} />
);
export const BuySellButton = (props: ButtonProps) => (
  <Button {...props} className={classNames(Styles.BuySellButton, props.className)} />
);
export const ApproveButton = (props: ButtonProps) => (
  <Button {...props} className={classNames(Styles.ApproveButton, props.className)} />
);
export const WalletButton = (props: ButtonProps) => (
  <Button {...props} className={classNames(Styles.WalletButton, props.className)} />
);
export const TextButton = (props: ButtonProps) => (
  <Button {...props} className={classNames(Styles.TextButton, props.className)} />
);

export interface DirectionButtonProps {
  action: Function;
  disabled?: boolean;
  title?: string;
  left?: boolean;
}

export const DirectionButton = ({ action, disabled, title, left }: DirectionButtonProps) => (
  <button
    onClick={(e) => action(e)}
    className={classNames(Styles.DirectionButton, {
      [Styles.Left]: left,
    })}
    disabled={disabled}
    title={title}
  >
    {Arrow}
  </button>
);

export const { ADD_LIQUIDITY, REMOVE_LIQUIDITY, ENTER_POSITION, EXIT_POSITION } = ApprovalAction;

export const { UNKNOWN, PENDING, APPROVED } = ApprovalState;

export const ApprovalButton = ({
  amm,
  cash,
  actionType,
  isApproved,
  shareToken = null,
}: {
  amm?: AmmExchange;
  cash: Cash;
  actionType: ApprovalAction;
  isApproved: boolean;
  shareToken?: string;
}) => {
  const [isPendingTx, setIsPendingTx] = useState(false);
  const {
    loginAccount,
    actions: { addTransaction },
  } = useUserStore();
  const marketCashType = cash?.name;
  const ammFactory = amm.ammFactoryAddress;
  const marketDescription = `${amm?.market?.title} ${amm?.market?.description}`;
  useEffect(() => {
    // make sure to flip local state off if we are approved, logged, pending
    if (isApproved && loginAccount && isPendingTx) {
      setIsPendingTx(false);
    }
  }, [isApproved, loginAccount, isPendingTx]);

  const approve = useCallback(async () => {
    try {
      setIsPendingTx(true);
      // defaults for ADD_LIQUIDITY/most used values.
      let ApprovalAction = approveERC20Contract;
      let address = cash?.address;
      let spender = ammFactory;
      let text = `Liquidity (${marketCashType})`;
      switch (actionType) {
        case EXIT_POSITION: {
          address = shareToken;
          text = `To Sell (${marketCashType})`;
          break;
        }
        case ENTER_POSITION: {
          text = `To Buy (${marketCashType})`;
          break;
        }
        case REMOVE_LIQUIDITY: {
          address = amm?.id;
          spender = ammFactory;
          text = `Liquidity (${marketCashType})`;
          break;
        }
        case ADD_LIQUIDITY:
        default: {
          break;
        }
      }
      const tx = await ApprovalAction(address, text, spender, loginAccount);
      tx.marketDescription = marketDescription;
      addTransaction(tx);
    } catch (error) {
      setIsPendingTx(false);
      console.error(error);
    }
  }, [cash, loginAccount, shareToken, amm]);

  if (!loginAccount || isApproved) {
    return null;
  }

  let buttonText = "";
  let subText = "";
  switch (actionType) {
    case ENTER_POSITION: {
      buttonText = "Approve to Buy";
      break;
    }
    case EXIT_POSITION: {
      buttonText = "Approve to Sell";
      break;
    }
    case REMOVE_LIQUIDITY: {
      buttonText = "Approve Removal";
      subText = "(approve to see removal estimation)";
      break;
    }
    default:
      buttonText = `Approve ${marketCashType}`;
      break;
  }

  return (
    <ApproveButton
      disabled={isPendingTx}
      text={isPendingTx ? "Approving..." : buttonText}
      subText={subText}
      action={() => approve()}
    />
  );
};

export const SearchButton = (props) => (
  <Button {...props} icon={SearchIcon} className={classNames(Styles.SearchButton, props.className)} />
);

export interface ExternalLinkButtonProps {
  label: string;
  URL?: string;
}

export const ExternalLinkButton = ({ label, URL }: ExternalLinkButtonProps) => (
  <button className={Styles.ExternalLinkButton}>
    {URL && (
      <a href={URL} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    )}
    {ViewIcon}
  </button>
);

export enum BUTTON_TYPES {
  PRIMARY = "Primary",
  SECONDARY = "Secondary",
  TINY = "Tiny",
}

export interface BaseThemeButtonProps {
  id?: string;
  text?: string;
  action?: Function;
  customContent?: any;
  customClass?: any;
  subText?: string;
  icon?: any;
  disabled?: boolean;
  title?: string;
  buttonType?: BUTTON_TYPES;
  invert?: boolean;
  reverseContent?: boolean;
  small?: boolean;
  ariaLabel?: string;
  href?: string;
}

export const BaseThemeButton = ({
  id,
  customContent = null,
  customClass = null,
  text,
  subText,
  icon,
  action = () => {},
  disabled = false,
  title,
  buttonType,
  invert = false,
  reverseContent = false,
  small = false,
  ariaLabel,
  href = null,
}: BaseThemeButtonProps) => {
  const content = customContent ? (
    customContent
  ) : (
    <>
      <span>{text}</span>
      {icon}
      <span>{subText}</span>
    </>
  );
  const props = {
    id,
    disabled,
    title,
    onClick: action,
    "arial-label": ariaLabel,
    className: classNames(
      Styles.BaseNormalButton,
      {
        [Styles[buttonType]]: true,
        [Styles.Inverted]: invert,
        [Styles.Reversed]: reverseContent,
        [Styles.Small]: small,
      },
      customClass
    ),
  };

  return href ? <a {...{ ...props, href }}>{content}</a> : <button {...{ ...props }}>{content}</button>;
};

export const PrimaryThemeButton = (props: BaseThemeButtonProps) => (
  <BaseThemeButton {...{ buttonType: BUTTON_TYPES.PRIMARY, ...props }} />
);

export const SecondaryThemeButton = (props: BaseThemeButtonProps) => (
  <BaseThemeButton {...{ buttonType: BUTTON_TYPES.SECONDARY, ...props }} />
);

export const TinyThemeButton = (props: BaseThemeButtonProps) => (
  <BaseThemeButton {...{ buttonType: BUTTON_TYPES.TINY, ...props }} />
);
