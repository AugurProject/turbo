import React, { useState } from "react";
import Styles from "./modal.styles.less";
import ButtonStyles from "../common/buttons.styles.less";
import { Header } from "./common";
import { Components } from "@augurproject/comps";
import { InfoNumbers, InfoNumberType } from "../market/trading-form";
import { MarketInfo } from "@augurproject/comps/build/types";
import { useSimplifiedStore } from "modules/stores/simplified";
const {
  ButtonComps: { SecondaryThemeButton },
  MarketCardComps: { MarketTitleArea },
} = Components;

export interface ModalConfirmTransactionProps {
  transactionButtonText: string;
  transactionAction: Function;
  title: string;
  breakdowns: Array<{
    heading: string;
    infoNumbers: Array<InfoNumberType>;
  }>;
  targetDescription: {
    market: MarketInfo;
    label: string;
    subLabel?: string;
  };
  footer?: {
    text: string;
    emphasize: string;
  };
}

const ModalConfirmTransaction = ({
  transactionButtonText,
  transactionAction,
  breakdowns = [],
  targetDescription,
  title,
  footer = null,
}: ModalConfirmTransactionProps) => {
  const [buttonText, setButtonText] = useState(transactionButtonText);
  return (
    <section className={Styles.ModalConfirmTransaction}>
      <Header title={title} />
      <main>
        <TargetDescription {...{ targetDescription }} />
        {breakdowns.length > 0 &&
          breakdowns.map(({ heading, infoNumbers }) => (
            <section key={`${heading}-breakdown`}>
              <h5>{heading}</h5>
              <InfoNumbers {...{ infoNumbers }} />
            </section>
          ))}
        <SecondaryThemeButton
          action={() => {
            transactionAction({
              onTrigger: () => setButtonText("Awaiting signing..."),
              onCancel: () => setButtonText(transactionButtonText),
            });
          }}
          text={buttonText}
          disabled={buttonText !== transactionButtonText}
          customClass={ButtonStyles.ReviewTransactionButton}
        />
        {footer && (
          <div className={Styles.FooterText}>
            {footer.text}
            {footer.emphasize && <span>{footer.emphasize}</span>}
          </div>
        )}
      </main>
    </section>
  );
};

const TargetDescription = ({ targetDescription }) => {
  const {
    settings: { timeFormat },
  } = useSimplifiedStore();
  const { market, label, subLabel = null } = targetDescription;
  return (
    <section className={Styles.TargetDescription}>
      <span>{label}</span>
      <MarketTitleArea {...{ ...market, timeFormat }} />
      {subLabel && <span>{subLabel}</span>}
    </section>
  );
};

export default ModalConfirmTransaction;
