import React, { useEffect } from "react";
import { DEFAULT_DATA_STATE, STUBBED_DATA_ACTIONS, PARA_CONFIG, NETWORK_BLOCK_REFRESH_TIME } from "./constants";
import { useData } from "./data-hooks";
import { useUserStore } from "./user";
import { getMarketInfos } from '../utils/contract-calls';


export const DataContext = React.createContext({
  ...DEFAULT_DATA_STATE,
  actions: STUBBED_DATA_ACTIONS,
});

export const DataStore = {
  actionsSet: false,
  get: () => ({ ...DEFAULT_DATA_STATE }),
  actions: STUBBED_DATA_ACTIONS,
};

export const DataProvider = ({ children }) => {
  const configCashes = getCashesInfo();
  const state = useData(configCashes);
  const { account, loginAccount } = useUserStore();
  const provider = loginAccount?.library || null;
  if (!DataStore.actionsSet) {
    DataStore.actions = state.actions;
    DataStore.actionsSet = true;
  }
  const readableState = { ...state };
  delete readableState.actions;
  DataStore.get = () => readableState;

  useEffect(() => {
    let isMounted = true;
    if (!!account && provider) {
      // get data immediately, then setup interval
      const markets = getMarketInfos(provider, state.markets, account);
      const { cashes, ammExchanges, blocknumber, actions: { updateDataHeartbeat } } = state;
      isMounted && updateDataHeartbeat({ ammExchanges, cashes, markets }, blocknumber ? blocknumber + 1 : 0, null);
    }
    const intervalId = setInterval(() => {
      if (!!account && provider) {
        const markets = getMarketInfos(provider, state.markets, account);
        const { cashes, ammExchanges, blocknumber, actions: { updateDataHeartbeat } } = state;
        isMounted && updateDataHeartbeat({ ammExchanges, cashes, markets }, blocknumber ? blocknumber + 1 : 0, null);
      }
    }, NETWORK_BLOCK_REFRESH_TIME[42]);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [account, provider]);

  return <DataContext.Provider value={state}>{children}</DataContext.Provider>;
};

export const useDataStore = () => React.useContext(DataContext);

const output = {
  DataProvider,
  useDataStore,
  DataStore,
};

// for now we jsut do this here... 
const getCashesInfo = (): any[] => {
  // @ts-ignore
  const { collateral } = PARA_CONFIG;
  // const paraValues = Object.values(paraDeploys);
  // const keysValues = paraValues.reduce((p, v) => ({ ...p, [v.name]: v }), {});
  const cashes = [
    {
      name: "USDC",
      displayDecimals: 2,
      decimals: 6,
      address: collateral,
      shareToken: '',
      usdPrice: '1',
      asset: '',
    }
  ];
  // const cashes = paraCashes[String(networkId)].Cashes;

  return cashes;
};

export default output;
