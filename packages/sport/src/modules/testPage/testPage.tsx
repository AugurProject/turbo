import React from "react";
import Styles from "./textPage.styles.less";
import { PrimaryThemeButton, SecondaryThemeButton, TinyThemeButton } from "../common/new-buttons";
import { Icons } from "@augurproject/comps";
import { TrashIcon } from "../betslip/betslip";
const { SimpleCheck, CopyIcon } = Icons;

export const TestPage = () => {
  return (
    <div className={Styles.TestPage}>
      <PrimaryThemeButton text="primary button" />
      <PrimaryThemeButton text="primary button disabled" disabled />
      <PrimaryThemeButton text="primary button Icon" icon={SimpleCheck} />
      <PrimaryThemeButton text="primary button Icon Reversed" reverseContent icon={SimpleCheck} />
      <PrimaryThemeButton text="primary small button" small />
      <PrimaryThemeButton text="primary small button disabled" small disabled />
      <PrimaryThemeButton text="primary small button Icon" small icon={SimpleCheck} />
      <PrimaryThemeButton text="primary small button Icon Reversed" small reverseContent icon={SimpleCheck} />

      <SecondaryThemeButton text="secondary button" />
      <SecondaryThemeButton text="secondary button disabled" disabled />
      <SecondaryThemeButton text="secondary button Icon" icon={TrashIcon} />
      <SecondaryThemeButton text="secondary button Icon Reversed" reverseContent icon={TrashIcon} />
      <SecondaryThemeButton text="secondary small button" small />
      <SecondaryThemeButton text="secondary small button disabled" small disabled />
      <SecondaryThemeButton text="secondary small button Icon" small icon={TrashIcon} />
      <SecondaryThemeButton text="secondary small button Icon Reversed" small reverseContent icon={TrashIcon} />

      <TinyThemeButton text="tiny button" />
      <TinyThemeButton text="tiny button disabled" disabled />
      <TinyThemeButton text="tiny button Icon" icon={CopyIcon} />
      <TinyThemeButton text="tiny button Icon Reversed" reverseContent icon={CopyIcon} />
      <div>
        <PrimaryThemeButton text="primary button" invert />
        <PrimaryThemeButton text="primary button disabled" disabled invert />
        <PrimaryThemeButton text="primary button Icon" icon={SimpleCheck} invert />
        <PrimaryThemeButton text="primary button Icon Reversed" reverseContent icon={SimpleCheck} invert />
        <PrimaryThemeButton text="primary small button" small invert />
        <PrimaryThemeButton text="primary small button disabled" small disabled invert />
        <PrimaryThemeButton text="primary small button Icon" small icon={SimpleCheck} invert />
        <PrimaryThemeButton text="primary small button Icon Reversed" small reverseContent icon={SimpleCheck} invert />

        <SecondaryThemeButton text="secondary button" invert />
        <SecondaryThemeButton text="secondary button disabled" disabled invert />
        <SecondaryThemeButton text="secondary button Icon" icon={TrashIcon} invert />
        <SecondaryThemeButton text="secondary button Icon Reversed" reverseContent icon={TrashIcon} invert />
        <SecondaryThemeButton text="secondary small button" small invert />
        <SecondaryThemeButton text="secondary small button disabled" small disabled invert />
        <SecondaryThemeButton text="secondary small button Icon" small icon={TrashIcon} invert />
        <SecondaryThemeButton text="secondary small button Icon Reversed" small reverseContent icon={TrashIcon} invert />

        <TinyThemeButton text="tiny button" invert />
        <TinyThemeButton text="tiny button disabled" disabled invert />
        <TinyThemeButton text="tiny button Icon" icon={CopyIcon} invert />
        <TinyThemeButton text="tiny button Icon Reversed" reverseContent icon={CopyIcon} invert />
      </div>
    </div>
  );
};
