import React, { ReactNode } from "react";
import Styles from "./buttons.styles.less";
import classNames from "classnames";
import { Spinner } from "./spinner";

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

export const TinyButton = (props: ButtonProps) => (
  <Button {...props} className={classNames(Styles.TinyButton, props.className)} />
);
export const BuySellButton = (props: ButtonProps) => (
  <Button {...props} className={classNames(Styles.BuySellButton, props.className)} />
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
  customClassName?: string;
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
  key?: string;
  selected?: boolean;
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
  selected = false,
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
      {subText && <span>{subText}</span>}
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
        [Styles.Selected]: selected,
        [Styles.IconOnly]: !text && !subText,
      },
      customClass
    ),
  };

  return href ? (
    <a target="_blank" {...{ ...props, href }}>
      {content}
    </a>
  ) : (
    <button {...{ ...props }}>{content}</button>
  );
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
