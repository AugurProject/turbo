import React, { useEffect, useState } from "react";
import Styles from "./buy-approvals.styles.less";
import classNames from "classnames";
import { useDataStore, useUserStore, Icons } from "@augurproject/comps";
import { PrimaryThemeButton } from "@augurproject/comps/build/components/common/buttons";
import { Cash } from "@augurproject/comps/build/types";
import { ammFactoryMarketNames } from "@augurproject/comps/build/utils/contract-calls";
import { USDC } from "modules/constants";
import { BetType } from "modules/stores/constants";
import { approveBuy, approveBuyReset } from "modules/utils";
import { TX_STATUS } from "@augurproject/comps/build/utils/constants";
import { PendingIcon } from "modules/betslip/betslip";
const { SimpleCheck } = Icons;

export const useUserApprovals = (bets: BetType[]): number => {
    const { markets } = useDataStore();
    const { balances: { approvals } } = useUserStore();
    const allAmmFactoryAddresses = Object.values(bets).reduce(
        (p, bet) => (p.includes(markets[bet.marketId].amm.ammFactoryAddress) ? p : [...p, markets[bet.marketId].amm.ammFactoryAddress]),
        []
    );
    return allAmmFactoryAddresses.filter(address => !approvals[address])?.length;
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
    const [needsApproval, setNeedsApproval] = useState<string[]>([])
    const [allAmmFactoryAddresses, setAllAmmFactoryAddresses] = useState([])

    useEffect(() => {
        const allAmmFactoryAddresses = Object.values(bets).reduce(
            (p, bet) => (p.includes(markets[bet.marketId].amm.ammFactoryAddress) ? p : [...p, markets[bet.marketId].amm.ammFactoryAddress]),
            []
        );    
        setAllAmmFactoryAddresses(allAmmFactoryAddresses);
        setNeedsApproval(allAmmFactoryAddresses.filter(address => !approvals[address]))
    }, [bets])
    
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
        await approveBuyReset(loginAccount, cash?.address, ammFactoryAddress);
    };

    const getIcon = (ammFactoryAddress) => {
        const hash = txHashes[ammFactoryAddress]
        if (!hash) return null;
        if (hashStatus[hash] === TX_STATUS.PENDING) return PendingIcon;
        if (hashStatus[hash] === TX_STATUS.CONFIRMED) return  SimpleCheck;
        return null;
    }
    const getPreTitle = (ammFactoryAddress) => {
        return hashStatus[txHashes[ammFactoryAddress]] === TX_STATUS.CONFIRMED ? `Can now bet` : `Allow betting`
    }

    const showReset = false; // used for debugging
    
    return (
        <>
            {needsApproval && needsApproval.map(ammFactoryAddress => (
                <div key={ammFactoryAddress} className={classNames(Styles.ApprovalButton, {
                    [Styles.Confirmed]: hashStatus[txHashes[ammFactoryAddress]] === TX_STATUS.CONFIRMED
                })}>
                    <PrimaryThemeButton small disabled={!!hashStatus[txHashes[ammFactoryAddress]]} action={() => doApproval(loginAccount, ammFactoryAddress)}
                        icon={getIcon(ammFactoryAddress)}
                        text={`${getPreTitle(ammFactoryAddress)} on ${factoryNames[ammFactoryAddress]} markets`}
                    />
                </div>
            ))}
            {showReset && allAmmFactoryAddresses && allAmmFactoryAddresses.map(ammFactoryAddress => (
                <div >
                    <PrimaryThemeButton small disabled={hashStatus[txHashes[ammFactoryAddress]] === TX_STATUS.PENDING} action={() => doResetApproval(loginAccount, ammFactoryAddress)}
                        text="Reset"
                    />
                </div>
            ))}
        </>
    )
}
