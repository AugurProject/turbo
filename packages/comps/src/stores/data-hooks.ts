import { dispatchMiddleware, arrayToKeyedObjectByProp } from "./utils";
import { useReducer } from "react";
import { windowRef } from "../utils/window-ref";
import { DATA_ACTIONS, DATA_KEYS, DEFAULT_DATA_STATE } from "./constants";
import { calculateAmmTotalVolApy } from "../utils/contract-calls";

const { UPDATE_DATA_HEARTBEAT, UPDATE_TRANSACTIONS } = DATA_ACTIONS;
const { AMM_EXCHANGES, BLOCKNUMBER, CASHES, ERRORS, MARKETS, TRANSACTIONS } = DATA_KEYS;

export function DataReducer(state, action) {
  const updatedState = { ...state };
  switch (action.type) {
    case UPDATE_TRANSACTIONS: {
      const { transactions } = action;
      const marketKeysFromTransactions = Object.keys(transactions).filter(
        (key) => !["userAddress", "claimedFees", "claimedProceeds", "positionBalance"].includes(key)
      );
      const unKeyedUpdates = marketKeysFromTransactions.map((marketId) => {
        const hasWinner = updatedState?.markets[marketId]?.hasWinner;
        const marketTransactions = transactions[marketId];
        const amm = state[AMM_EXCHANGES][marketId];
        const { apy, vol, vol24hr } = calculateAmmTotalVolApy(amm, marketTransactions, hasWinner);
        return {
          ...marketTransactions,
          apy,
          volumeTotalUSD: vol,
          volume24hrTotalUSD: vol24hr,
        };
      });

      const updatedTransactions = arrayToKeyedObjectByProp(unKeyedUpdates, "id");

      updatedState[TRANSACTIONS] = {
        ...transactions,
        ...updatedTransactions,
      };
      break;
    }
    case UPDATE_DATA_HEARTBEAT: {
      const { markets, cashes, ammExchanges, errors, blocknumber } = action;
      updatedState[MARKETS] = markets;
      updatedState[CASHES] = cashes;
      updatedState[AMM_EXCHANGES] = ammExchanges;
      updatedState[ERRORS] = errors || null;
      updatedState[BLOCKNUMBER] = blocknumber ? blocknumber : updatedState[BLOCKNUMBER];
      break;
    }
    default:
      console.log(`Error: ${action.type} not caught by Graph Data reducer`);
  }
  windowRef.data = updatedState;
  return updatedState;
}

export const useData = (cashes, defaultState = DEFAULT_DATA_STATE) => {
  const stateCashes = cashes.reduce((acc, cash) => {
    acc[cash.address] = cash;
    return acc;
  }, {});

  const [state, pureDispatch] = useReducer(DataReducer, { ...defaultState, [CASHES]: stateCashes });
  const dispatch = dispatchMiddleware(pureDispatch);
  windowRef.data = state;

  return {
    ...state,
    actions: {
      updateTransactions: (transactions) => dispatch({ type: UPDATE_TRANSACTIONS, transactions }),
      updateDataHeartbeat: ({ markets, cashes, ammExchanges }, blocknumber, errors) =>
        dispatch({
          type: UPDATE_DATA_HEARTBEAT,
          ammExchanges,
          blocknumber,
          cashes,
          errors,
          markets,
        }),
    },
  };
};
