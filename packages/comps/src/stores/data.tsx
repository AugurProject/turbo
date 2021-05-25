import React, { useEffect } from "react";
import { DEFAULT_DATA_STATE, STUBBED_DATA_ACTIONS, PARA_CONFIG, NETWORK_BLOCK_REFRESH_TIME } from "./constants";
import { useData } from "./data-hooks";
import { useUserStore } from "./user";
import { getMarketInfos } from "../utils/contract-calls";
import { getAllTransactions } from "../apollo/client";
import { getDefaultProvider } from "../components/ConnectAccount/utils";

export const DataContext = React.createContext({
  ...DEFAULT_DATA_STATE,
  actions: STUBBED_DATA_ACTIONS,
});

export const DataStore = {
  actionsSet: false,
  get: () => ({ ...DEFAULT_DATA_STATE }),
  actions: STUBBED_DATA_ACTIONS,
};

export const DataProvider = ({ children }: any) => {
  const configCashes = getCashesInfo();
  const state = useData(configCashes);
  const { account, loginAccount } = useUserStore();
  const {
    cashes,
    actions: { updateDataHeartbeat, updateTransactions },
  } = state;
  if (!DataStore.actionsSet) {
    DataStore.actions = state.actions;
    DataStore.actionsSet = true;
  }
  const readableState = { ...state };
  delete readableState.actions;
  DataStore.get = () => readableState;
  const networkId = Number(PARA_CONFIG.networkId);
  const library = loginAccount?.library;

  useEffect(() => {
    const defaultProvider = getDefaultProvider();
    const provider = library ? library : defaultProvider;
    const getMarkets = async () => {
      let data = { markets: {}, ammExchanges: {}, blocknumber: null, loading: true }
      try {
        data = await getMarketInfos(provider, DataStore.get().markets, cashes, account);
      } catch(e) {
        console.log('error getting market data', e)
      };
      return data;
    };
    getMarkets().then(({ markets, ammExchanges, blocknumber, loading }) => {
      updateDataHeartbeat({ ammExchanges, cashes, markets }, blocknumber, null, loading);
    });

    const intervalId = setInterval(() => {
      getMarkets().then(({ markets, ammExchanges, blocknumber, loading }) => {
        updateDataHeartbeat({ ammExchanges, cashes, markets }, blocknumber, null, loading);
      });
    }, NETWORK_BLOCK_REFRESH_TIME[networkId]);
    return () => {
      clearInterval(intervalId);
    };
  }, [account, library]);

  useEffect(() => {
    const fetchTransactions = () =>
      getAllTransactions(account?.toLowerCase(), (transactions) => updateTransactions(transactions));

    fetchTransactions();

    const intervalId = setInterval(() => {
      fetchTransactions();
    }, NETWORK_BLOCK_REFRESH_TIME[networkId]);
    return () => {
      clearInterval(intervalId);
    };
  }, [account]);

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
  const { marketFactories } = PARA_CONFIG;
  const { collateral: usdcCollateral } = marketFactories.sportsball;
  // todo: need to grab all collaterals per market factory

  const cashes = [
    {
      name: "USDC",
      displayDecimals: 2,
      decimals: 6,
      address: usdcCollateral,
      shareToken: "",
      usdPrice: "1",
      asset: "",
    },
    {
      name: "ETH",
      displayDecimals: 4,
      decimals: 18,
      address: "0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa", // WETH address on Matic Mumbai
      shareToken: "",
      usdPrice: "2000",
      asset: "ETH",
    },
  ];

  return cashes;
};

export default output;
