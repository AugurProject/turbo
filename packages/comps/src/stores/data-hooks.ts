import { dispatchMiddleware } from "./utils";
import { useReducer } from "react";
import { windowRef } from "../utils/window-ref";
import { DATA_ACTIONS, DATA_KEYS, DEFAULT_DATA_STATE } from "./constants";

const { UPDATE_DATA_HEARTBEAT, UPDATE_LIQUIDITIES } = DATA_ACTIONS;
const { AMM_EXCHANGES, BLOCKNUMBER, CASHES, ERRORS, MARKETS, LOADING, LIQUIDITIES } = DATA_KEYS;

export function DataReducer(state, action) {
  const updatedState = { ...state };
  switch (action.type) {
    case UPDATE_LIQUIDITIES: {
      // this is temporary to prove out data from graph.
      const { liquidities } = action;
      updatedState[LIQUIDITIES] = liquidities;
      break;
    }
    case UPDATE_DATA_HEARTBEAT: {
      const { markets, cashes, ammExchanges, errors, blocknumber, loading } = action;
      updatedState[MARKETS] = markets;
      updatedState[CASHES] = cashes;
      updatedState[AMM_EXCHANGES] = ammExchanges;
      updatedState[ERRORS] = errors || null;
      updatedState[BLOCKNUMBER] = blocknumber ? blocknumber : updatedState[BLOCKNUMBER];
      updatedState[LOADING] = loading;
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
      updateLiquidities: (liquidities) => dispatch({ type: UPDATE_LIQUIDITIES, liquidities }),
      updateDataHeartbeat: ({ markets, cashes, ammExchanges }, blocknumber, errors, loading) =>
        dispatch({
          type: UPDATE_DATA_HEARTBEAT,
          ammExchanges,
          blocknumber,
          cashes,
          errors,
          markets,
          loading,
        }),
    },
  };
};
