import React from "react";
import Styles from "./buttons.styles.less";
import classNames from "classnames";

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
  tiny?: boolean;
  ariaLabel?: string;
  href?: string;
  key?: string;
  selected?: boolean;
  noHighlight?: boolean;
  error?: string;
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
  noHighlight = false,
  error
}: BaseThemeButtonProps) => {
  const hasError = error && error !== '';
  const content = customContent ? (
    customContent
  ) : (
    <>
      <span>{hasError ? error : text}</span>
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
        [Styles.Error]: hasError,
        [Styles.Selected]: selected,
        [Styles.IconOnly]: !text && !subText,
        [Styles.NoHighlight]: noHighlight,
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
