import React from "react";
import Styles from "./modal.styles.less";
import ButtonStyles from "../common/buttons.styles.less";
import { Header } from "./common";
import { useAppStatusStore } from "@augurproject/comps";

const ModalConfirmTransaction = () => {
  const {
    actions: { closeModal },
  } = useAppStatusStore();
  return (
    <section>
      <Header title="" actionButton={() => closeModal()} />
      <main></main>
    </section>
  );
};

export default ModalConfirmTransaction;