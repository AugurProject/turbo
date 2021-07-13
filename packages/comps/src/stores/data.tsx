import React, { useEffect, useRef } from "react";
import {
  DEFAULT_DATA_STATE,
  STUBBED_DATA_ACTIONS,
  PARA_CONFIG,
  NETWORK_BLOCK_REFRESH_TIME,
  MARKET_IGNORE_LIST,
} from "./constants";
import { useData } from "./data-hooks";
import { useUserStore, UserStore } from "./user";
import { getMarketInfos } from "../utils/contract-calls";
import { getAllTransactions, getMarketsData } from "../apollo/client";
import { getDefaultProvider } from "../components/ConnectAccount/utils";
import { useAppStatusStore, AppStatusStore } from "./app-status";
import { deriveMarketInfo } from "../utils/derived-market-data";
import { MARKET_FACTORY_TYPES } from "../utils/constants";

export const DataContext = React.createContext({
  ...DEFAULT_DATA_STATE,
  actions: STUBBED_DATA_ACTIONS,
});

export const DataStore = {
  actionsSet: false,
  get: () => ({ ...DEFAULT_DATA_STATE }),
  actions: STUBBED_DATA_ACTIONS,
};
const GRAPH_MARKETS = {
  "cryptoMarkets": MARKET_FACTORY_TYPES.CRYPTO,
  "mmaMarkets": MARKET_FACTORY_TYPES.MMALINK,
  "teamSportsMarkets": MARKET_FACTORY_TYPES.SPORTSLINK,
}
export const DataProvider = ({ loadType = "SIMPLIFIED", children }: any) => {
  const configCashes = getCashesInfo();
  const state = useData(configCashes);
  const { account } = useUserStore();
  const defaultProvider = useRef(getDefaultProvider());
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
  useEffect(() => {
    let isMounted = true;
    let intervalId = null;
    const getMarkets = async () => {
      try {
        const { account: userAccount, loginAccount } = UserStore.get();
        const { isRpcDown } = AppStatusStore.get();
        const { blocknumber: dblock, markets: dmarkets, ammExchanges: damm } = DataStore.get();
        const provider = loginAccount?.library || defaultProvider?.current;
        const graphMarkets = await getMarketsData((data, block, errors) => {
          console.log(data, block, errors);
          const markets = Object.keys(GRAPH_MARKETS).reduce((p, key) => {
            const markets = data[key].map(m => deriveMarketInfo(m, m, GRAPH_MARKETS[key]));
            return [...p, ...markets];
          }, []);
          console.log('filled markets', markets);
          console.log('spread', markets.filter(m => m.spreadLine));
        });
        const infos = await getMarketInfos(
          provider,
          dmarkets,
          damm,
          cashes,
          userAccount,
          MARKET_IGNORE_LIST,
          loadType,
          dblock
        );
        if (isRpcDown) {
          AppStatusStore.actions.setIsRpcDown(false);
        }
        return infos;
      } catch (e) {
        if (e.data?.error?.details) {
          if (e.data?.error?.details.toLowerCase().indexOf('rate limit') !== -1) {
            if (e.data?.error?.data?.rate_violated.toLowerCase().indexOf('700 per 1 minute') !== -1) {
              AppStatusStore.actions.setIsRpcDown(true);
            }
          }
        }
        console.log("error getting market data", e);
      }
      return { markets: {}, ammExchanges: {}, blocknumber: null };
    };

    getMarkets().then(({ markets, ammExchanges, blocknumber }) => {
      isMounted && blocknumber && blocknumber > DataStore.get().blocknumber && updateDataHeartbeat({ ammExchanges, cashes, markets }, blocknumber, null);
      intervalId = setInterval(() => {
        getMarkets().then(({ markets, ammExchanges, blocknumber }) => {
          isMounted && blocknumber && blocknumber > DataStore.get().blocknumber && updateDataHeartbeat({ ammExchanges, cashes, markets }, blocknumber, null);
        });
      }, NETWORK_BLOCK_REFRESH_TIME[networkId]);
    });

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchTransactions = () =>
      getAllTransactions(account?.toLowerCase(), (transactions) => isMounted && updateTransactions(transactions));

    fetchTransactions();

    const intervalId = setInterval(() => {
      fetchTransactions();
    }, NETWORK_BLOCK_REFRESH_TIME[networkId]);
    return () => {
      isMounted = false;
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
  const { collateral: usdcCollateral } = marketFactories[0];
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
