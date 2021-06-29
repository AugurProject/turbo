import React, { useState, useMemo } from "react";
import { useDataStore, useUserStore } from "@augurproject/comps";
import { PrimaryThemeButton } from "@augurproject/comps/build/components/common/buttons";
import { Cash } from "@augurproject/comps/build/types";
import { ammFactoryMarketNames } from "@augurproject/comps/build/utils/contract-calls";
import { USDC } from "modules/constants";
import { BetType } from "modules/stores/constants";
import { approveBuy, approveBuyReset } from "modules/utils";
import { TX_STATUS } from "@augurproject/comps/build/utils/constants";
import { PendingIcon } from "modules/betslip/betslip";

export const useUserApprovals = (bets: BetType[]): boolean => {
    const { markets } = useDataStore();
    const { balances: { approvals } } = useUserStore();
    const allAmmFactoryAddresses = Object.values(bets).reduce(
        (p, bet) => (p.includes(markets[bet.marketId].amm.ammFactoryAddress) ? p : [...p, markets[bet.marketId].amm.ammFactoryAddress]),
        []
    );

    const needsApproval = allAmmFactoryAddresses.filter(address => !approvals[address]);
    return needsApproval.length > 0;
}

export const BuyApprovals = ({ bets }: { [betId: string]: BetType }) => {
    const {
        loginAccount,
        actions: { addTransaction },
        transactions
    } = useUserStore();
    const { markets, cashes } = useDataStore();
    const { balances: { approvals } } = useUserStore();
    const factoryNames = ammFactoryMarketNames();
    const [txHashes, setTxHashes] = useState<{ [address: string]: string }>({});
    const allAmmFactoryAddresses = Object.values(bets).reduce(
        (p, bet) => (p.includes(markets[bet.marketId].amm.ammFactoryAddress) ? p : [...p, markets[bet.marketId].amm.ammFactoryAddress]),
        []
    );

    const needsApproval = allAmmFactoryAddresses.filter(address => !approvals[address]);
    const cash = Object.values(cashes).find((c: Cash) => c.name === USDC) as Cash;
    const hashStatus = transactions.reduce((p, tx) => ({ ...p, [tx.hash]: tx.status }), {});

    const doApproval = async (loginAccount, ammFactoryAddress) => {
        const txDetails = await approveBuy(loginAccount, cash?.address, ammFactoryAddress);
        if (txDetails?.hash) {
            addTransaction(txDetails);
            setTxHashes({ ...txHashes, [ammFactoryAddress]: txDetails.hash })
        }
    };

    const doResetApproval = async (loginAccount, ammFactoryAddress) => {
        const txDetails = await approveBuyReset(loginAccount, cash?.address, ammFactoryAddress);
        if (txDetails?.hash) {
            addTransaction(txDetails);
            setTxHashes({ ...txHashes, [ammFactoryAddress]: txDetails.hash })
        }
    };

    return (
        <>
            {needsApproval && needsApproval.map(ammFactoryAddress => (
                <div >
                    <PrimaryThemeButton small disabled={hashStatus[txHashes[ammFactoryAddress]] === TX_STATUS.PENDING} action={() => doApproval(loginAccount, ammFactoryAddress)}
                        customContent={
                            <>
                            <span>{`Allow betting on ${factoryNames[ammFactoryAddress]} markets`}</span>
                            {hashStatus[txHashes[ammFactoryAddress]] === TX_STATUS.PENDING && PendingIcon}
                            </>
                        }
                    />
                </div>
            ))}
            {allAmmFactoryAddresses && allAmmFactoryAddresses.map(ammFactoryAddress => (
                <div >
                    <PrimaryThemeButton small disabled={hashStatus[txHashes[ammFactoryAddress]] === TX_STATUS.PENDING} action={() => doResetApproval(loginAccount, ammFactoryAddress)}
                        text="Reset"
                    />
                </div>
            ))}
        </>
    )
}
