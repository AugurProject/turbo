import React, { useEffect, useState } from "react";
import Styles from "./buy-approvals.styles.less";
import classNames from "classnames";
import {
  useDataStore,
  useUserStore,
  Icons,
  ButtonComps,
  Constants,
  LabelComps,
} from "@augurproject/comps";
import { Cash } from "@augurproject/comps/build/types";
import { USDC } from "../constants";
import { BetType, BetslipStateType } from "../stores/constants";
import { useBetslipStore } from "../stores/betslip";
import { approveBuy, approveBuyReset } from "../utils";
import { PendingIcon } from "../betslip/betslip";
const { SimpleCheck } = Icons;
const { PrimaryThemeButton } = ButtonComps;
const { TX_STATUS } = Constants;
const { generateTooltip } = LabelComps;

// const APPROVAL_NEEDED = `An Approval transaction is required to give contracts permission to accept your USDC. You only need to do this once per market type.`;
const APPROVAL_NEEDED = `An Approval transaction is required to give contracts permission to accept your USDC. You only need to do this once.`;

export const useUserApprovals = (): {
  allFactoryAddresses: string[];
  approvalArray: string[];
  numApprovalsNeeded: number;
} => {
  const { markets } = useDataStore();
  const { bets }: BetslipStateType = useBetslipStore();
  const {
    balances: { approvals },
  } = useUserStore();
  const allFactoryAddresses = Object.values(bets).reduce(
    (p: string[], bet: BetType) =>
      p.includes(markets[bet?.marketId]?.amm?.ammFactoryAddress)
        ? p
        : [...p, markets[bet.marketId].amm.ammFactoryAddress],
    []
  );
  const approvalArray = allFactoryAddresses.filter((address) => !approvals?.[address]);
  return {
    allFactoryAddresses,
    approvalArray,
    numApprovalsNeeded: approvalArray.length,
  };
};

export const BuyApprovals = () => {
  const {
    account,
    loginAccount,
    balances: { approvals },
    transactions,
    actions: { addTransaction },
  } = useUserStore();
  const { bets } = useBetslipStore();
  const { cashes } = useDataStore();
  const [txHashes, setTxHashes] = useState<{ [address: string]: string }>({});
  const [needsApproval, setNeedsApproval] = useState<string[]>([]);
  const [allAmmFactoryAddresses, setAllAmmFactoryAddresses] = useState([]);
  const { allFactoryAddresses, approvalArray } = useUserApprovals();

  useEffect(() => {
    setAllAmmFactoryAddresses(allFactoryAddresses);
    setNeedsApproval(approvalArray);
  }, [bets, approvals, account]);

  const cash = Object.values(cashes).find((c: Cash) => c.name === USDC) as Cash;
  const hashStatus = transactions.reduce((p, tx) => ({ ...p, [tx.hash]: tx.status }), {});

  const doApproval = async (loginAccount, ammFactoryAddress) => {
    const txDetails = await approveBuy(loginAccount, cash?.address, ammFactoryAddress);
    if (txDetails?.hash) {
      addTransaction(txDetails);
      setTxHashes({ ...txHashes, [ammFactoryAddress]: txDetails.hash });
    }
  };

  const doResetApproval = async (loginAccount, ammFactoryAddress) => {
    await approveBuyReset(loginAccount, cash?.address, ammFactoryAddress);
  };

  const getIcon = (ammFactoryAddress) => {
    const hash = txHashes[ammFactoryAddress];
    if (!hash) return null;
    if (hashStatus[hash] === TX_STATUS.PENDING) return PendingIcon;
    if (hashStatus[hash] === TX_STATUS.CONFIRMED) return SimpleCheck;
    return null;
  };
  const getPreTitle = (ammFactoryAddress) => {
    return hashStatus[txHashes[ammFactoryAddress]] === TX_STATUS.CONFIRMED ? `Can now bet` : `Approve betting`;
  };

  const showReset = false; // used for debugging

  return (
    <>
      {needsApproval?.map((ammFactoryAddress) => (
        <div
          key={`${ammFactoryAddress}-approval-button`}
          className={classNames(Styles.ApprovalButtonRow, {
            [Styles.Confirmed]: hashStatus[txHashes[ammFactoryAddress]] === TX_STATUS.CONFIRMED,
          })}
        >
          <PrimaryThemeButton
            small
            disabled={!!hashStatus[txHashes[ammFactoryAddress]]}
            action={() => doApproval(loginAccount, ammFactoryAddress)}
            icon={getIcon(ammFactoryAddress)}
            text={`${getPreTitle(ammFactoryAddress)} on markets`}
          />
          {generateTooltip(APPROVAL_NEEDED, `${ammFactoryAddress}-approval-tip`)}
        </div>
      ))}
      {showReset &&
        allAmmFactoryAddresses?.map((ammFactoryAddress) => (
          <div key={`${ammFactoryAddress}-reset-button`} className={Styles.ResetButtonRow}>
            <PrimaryThemeButton
              small
              disabled={hashStatus[txHashes[ammFactoryAddress]] === TX_STATUS.PENDING}
              action={() => doResetApproval(loginAccount, ammFactoryAddress)}
              text="Reset"
            />
          </div>
        ))}
    </>
  );
};
