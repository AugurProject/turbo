import React from "react";
import classNames from "classnames";
import Styles from "./new-buttons.styles.less";

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
  return (
    <button
      id={id}
      disabled={disabled}
      title={title}
      onClick={action}
      className={classNames(
        Styles.BaseNormalButton,
        {
          [Styles[buttonType]]: true,
          [Styles.Inverted]: invert,
          [Styles.Reversed]: reverseContent,
          [Styles.Small]: small,
        },
        customClass
      )}
    >
      {content}
    </button>
  );
};

export const PrimaryThemeButton = (props: BaseThemeButtonProps) => <BaseThemeButton {...{ buttonType: BUTTON_TYPES.PRIMARY, ...props }} />;

export const SecondaryThemeButton = (props: BaseThemeButtonProps) => <BaseThemeButton {...{ buttonType: BUTTON_TYPES.SECONDARY, ...props }} />;

export const TinyThemeButton = (props: BaseThemeButtonProps) => <BaseThemeButton {...{ buttonType: BUTTON_TYPES.TINY, ...props }} />;

