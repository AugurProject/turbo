import ApolloClient from "apollo-boost";
import { GET_MARKETS, GET_BLOCK, CASH_TOKEN_DATA } from "./queries";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { Cash } from "../utils/types";
import { InMemoryCache } from "apollo-cache-inmemory";
import { ErrorPolicy, FetchPolicy } from "apollo-client";
import { ETH } from "../utils/constants";
import { SEARCH_MARKETS } from "./queries";
import { PARA_CONFIG } from "../stores/constants";
import { getMarketInfos } from "../utils/contract-calls";
import { Web3Provider } from "@ethersproject/providers";

dayjs.extend(utc);

const defaultOptions = {
  watchQuery: {
    fetchPolicy: "no-cache" as FetchPolicy,
    errorPolicy: "ignore" as ErrorPolicy,
  },
  query: {
    fetchPolicy: "no-cache" as FetchPolicy,
    errorPolicy: "all" as ErrorPolicy,
  },
};

export const client = augurV2Client("https://api.thegraph.com/subgraphs/name/ianlapham/uniswapv2");

export const healthClient = augurV2Client("https://api.thegraph.com/index-node/graphql");

export function blockClient(uri: string) {
  return new ApolloClient({
    uri,
  });
}

export function augurV2Client(uri: string) {
  const client = new ApolloClient({
    uri,
    cache: new InMemoryCache({
      addTypename: false,
    }),
  });
  client.defaultOptions = defaultOptions;
  return client;
}

export async function getMarketsData(library: Web3Provider, account: string, updateHeartbeat: Function) {
  const cashes = getCashesInfo();
  let markets = {};
  let past = {}
  /*
  const clientConfig = getClientConfig();
  let response = null;
  let responseUsd = null;
  let block = null;
  try {
    block = await getPastDayBlockNumber(clientConfig.blockClient);
    response = await augurV2Client(clientConfig.augurClient).query({
      query: GET_MARKETS(block),
      variables: {
        block: {
          number: block,
        },
      },
    });
    responseUsd = await getCashTokenData(cashes);
  } catch (e) {
    console.error(e);
    updateHeartbeat(null, null, e);
  }

  if (!responseUsd) return updateHeartbeat(null, null, "Data could not be retreived");
  if (response) {
    if (response.errors) {
      console.error(JSON.stringify(response.errors, null, 1));
    }

    updateHeartbeat(
      {
        ...response.data,
        cashes: responseUsd,
      },
      block,
      response?.errors
    );
  }
  */

  // todo: need this in a config file, 
  //const url = "https://eth-kovan.alchemyapi.io/jsonrpc/1FomA6seLdWDvpIRvL9J5NhwPHLIGbWA";
  //const library = new ethers.providers.JsonRpcProvider(url);

  // call to get markets
  markets = getMarketInfos(library, account, cashes)


  // todo: version 0 hardcoding
  updateHeartbeat(
    {
      markets,
      past,
      cashes,
    },
    0,
    ''
  );

}

export async function searchMarkets(searchString, cb) {
  const clientConfig = getClientConfig();
  let response = null;
  if (searchString === "") return cb(null, []);
  const searchQuery = searchString.trim().split(" ").join(" & ");
  try {
    response = await augurV2Client(clientConfig.augurClient).query({
      query: SEARCH_MARKETS,
      variables: {
        query: `${searchQuery}:*`,
      },
    });
  } catch (e) {
    cb(e, []);
    console.error(e);
  }

  if (response) {
    if (response.errors) {
      console.error(JSON.stringify(response.errors, null, 1));
    }
    if (response?.data?.marketSearch) cb(null, [...response.data.marketSearch?.map((market) => market.id)]);
    else cb(null, []);
  }
}

async function getPastDayBlockNumber(blockClient) {
  const utcCurrentTime = dayjs.utc();
  const utcOneDayBack = utcCurrentTime.subtract(1, "day").unix();
  const block = await getBlockFromTimestamp(utcOneDayBack, blockClient);
  return block;
}

/**
 * @notice Fetches first block after a given timestamp
 * @dev Query speed is optimized by limiting to a 600-second period
 * @param {Int} timestamp in seconds
 */
export async function getBlockFromTimestamp(timestamp, url) {
  const result = await blockClient(url).query({
    query: GET_BLOCK,
    variables: {
      begin: timestamp,
      end: timestamp + 600,
    },
  });
  return result ? result?.data?.blocks?.[0]?.number : 0;
}

const getCashTokenData = async (cashes: Cash[]): Promise<{ [address: string]: Cash }> => {
  const bulkResults = await Promise.all(
    cashes.map(async (cash) => {
      let usdPrice = await client.query({
        query: CASH_TOKEN_DATA,
        variables: {
          tokenAddr: cash?.address,
        },
        fetchPolicy: "cache-first",
      });
      let tokenData = { usdPrice: usdPrice?.data?.tokenDayDatas[0], ...cash };
      if (!tokenData.usdPrice) {
        // TODO: remove this, used only form kovan testing
        tokenData = {
          ...cash,
          usdPrice: cash?.name === ETH ? "1300" : "1",
        };
      }
      return tokenData;
    })
  );
  return (bulkResults || []).reduce((p, a) => ({ ...p, [a.address]: a }), {});
};

// https://thegraph.com/explorer/subgraph/augurproject/augur-v2-staging
// kovan playground
const getClientConfig = (): { augurClient: string; blockClient: string } => {
  const { networkId } = PARA_CONFIG;
  const clientConfig = {
    "1": {
      augurClient: "https://api.thegraph.com/subgraphs/name/augurproject/augur-v2-staging",
      blockClient: "https://api.thegraph.com/subgraphs/name/blocklytics/ethereum-blocks",
      network: "mainnet",
    },
    "42": {
      augurClient: "https://api.thegraph.com/subgraphs/name/augurproject/augur-v2-staging",
      blockClient: "https://api.thegraph.com/subgraphs/name/blocklytics/kovan-blocks",
      network: "kovan",
    },
  };
  return clientConfig[Number(networkId)];
};

const paraCashes = {
  "1": {
    networkId: "1",
    Cashes: [
      {
        name: "ETH",
        displayDecimals: 4,
      },
      {
        name: "USDC",
        displayDecimals: 2,
      },
    ],
    network: "mainnet",
  },
  "42": {
    networkId: "42",
    Cashes: [
      {
        name: "USDC",
        displayDecimals: 2,
        // todo: hardcoding for version 0
        address: "0xa8B96fA03798958c2C7E501da75a648a4Df157F4",
        decimals: 6,
        usdPrice: 1
      },
    ],
    network: "kovan",
  },
};

const getCashesInfo = (): { [address: string]: Cash } => {
  const { networkId } = PARA_CONFIG;
  const cashes = paraCashes[String(networkId)].Cashes;

  // need to figure out share token
  return (cashes).reduce((p, a) => ({ ...p, [a.address]: a }), {});
};
