import React from "react";
import classNames from "classnames";
import Styles from "./new-buttons.styles.less";

export enum BUTTON_TYPES {
  PRIMARY = "Primary",
  SECONDARY = "Secondary",
  TINY = "Tiny",
}

export interface BaseButtonProps {
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
  reversed?: boolean;
}

export const BaseButton = ({
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
  reversed = false,
}: BaseButtonProps) => {
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
        Styles.BaseButton,
        {
          [Styles[buttonType]]: true,
          [Styles.Reversed]: reversed,
        },
        customClass
      )}
    >
      {content}
    </button>
  );
};
