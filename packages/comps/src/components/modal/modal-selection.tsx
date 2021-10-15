import React from "react";
import Styles from "./modal.styles.less";
import classNames from "classnames";
import { SimpleCheck } from "../common/icons";

const OptionsList = ({ options, action, closeModal, selected }) => (
  <ul>
    {options.map(({ label, value }) => (
      <li
        key={value}
        className={classNames({
          [Styles.selected]: selected === value,
        })}
        onClick={() => {
          action(value);
          closeModal();
        }}
      >
        {label}
        {selected === value && SimpleCheck}
      </li>
    ))}
  </ul>
);

export interface ModalSelectionProps {
  options: {
    label: string;
    value: string;
  };
  action: Function;
  defaultValue: string;
  selected: string;
  title: string;
  closeModal: Function;
}

const ModalSelection = ({
  options,
  action,
  defaultValue,
  selected,
  title,
  closeModal,
}: ModalSelectionProps) => {
  return (
    <section className={Styles.ModalSelection}>
      <header>
        {title}
      </header>
      <main>
        <OptionsList
          options={options}
          action={action}
          closeModal={closeModal}
          selected={selected}
        />
      </main>
    </section>
  );
};

export default ModalSelection;
