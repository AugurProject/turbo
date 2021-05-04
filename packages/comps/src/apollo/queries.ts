import gql from "graphql-tag";

export const GET_BLOCK = gql`
  query blocksAround($begin: Int, $end: Int) {
    blocks(first: 1, orderBy: timestamp, orderDirection: asc, where: { timestamp_gt: $begin, timestamp_lt: $end }) {
      id
      number
      timestamp
    }
  }
`;

export const SEARCH_MARKETS = gql`
  query searchMarkets($query: String) {
    marketSearch(text: $query) {
      id
    }
  }
`;

// Get all markets except CATEGORICAL
// https://thegraph.com/explorer/subgraph/augurproject/augur-turbo-kovan
const AMM_enters = gql`
  fragment AMM_enters on AMMExchange {
    enters {
      id
      sender {
        id
      }
      tx_hash
      timestamp
      yesShares
      noShares
      price
      cash
    }
  }
`;

const AMM_exits = gql`
  fragment AMM_exits on AMMExchange {
    exits {
      id
      sender {
        id
      }
      tx_hash
      price
      timestamp
      yesShares
      noShares
      cash
    }
  }
`;

const AMM_addLiquidity = gql`
  fragment AMM_addLiquidity on AMMExchange {
    addLiquidity {
      id
      sender {
        id
      }
      tx_hash
      timestamp
      yesShares
      noShares
      cash
      cashValue
      lpTokens
      noShareCashValue
      yesShareCashValue
      netShares
    }
  }
`;

const AMM_removeLiquidity = gql`
  fragment AMM_removeLiquidity on AMMExchange {
    removeLiquidity {
      id
      sender {
        id
      }
      tx_hash
      timestamp
      yesShares
      noShares
      cashValue
      noShareCashValue
      yesShareCashValue
    }
  }
`;

const AMM_swaps = gql`
  fragment AMM_swaps on AMMExchange {
    swaps {
      id
      sender {
        id
      }
      tx_hash
      timestamp
      yesShares
      noShares
    }
  }
`;

const AMM_common = gql`
  fragment AMM_common on AMMExchange {
    id
    shareToken {
      id
      cash {
        id
      }
    }
    volumeYes
    volumeNo
    percentageYes
    percentageNo
    liquidity
    liquidityYes
    liquidityNo
    liquidityInvalid
    totalSupply
    cashBalance
  }
`;

export const CurrentMarket_fields = gql`
  {
    markets {
      id
      addLiquidity {
        id
        marketId {
          id
        }
        sender {
          id
        }
        transactionHash
        timestamp
        collateral
        lpTokens
      }
      removeLiquidity {
        id
        marketId {
          id
        }
        sender {
          id
        }
        transactionHash
        timestamp
        outcomes {
          id
        }
      }
      trades {
        id
        marketId {
          id
        }
        user
        outcome
        collateral
        price
        shares
        timestamp
        transactionHash
      }
    }
  }
`;

export const test = gql`
  query senders($account: String) {
    senders(where: { id: $account }) {
      claimedFees {
        id
        cash
        timestamp
        transactionHash
        receiver
      }
      claimedProceeds {
        id
        fees
        outcome
        marketId
        timestamp
        transactionHash
        cash
      }
    }
  }
`;

export const BIG_TEST = gql`
  query getTransactions($account: String) {
    senders(where: { id: $account }) {
      claimedFees {
        id
        cash
        timestamp
        transactionHash
        receiver
      }
      claimedProceeds {
        id
        fees
        outcome
        marketId
        timestamp
        transactionHash
        cash
      }
    }
    markets {
      id
      addLiquidity {
        id
        marketId {
          id
        }
        sender {
          id
        }
        transactionHash
        timestamp
        collateral
        lpTokens
      }
      removeLiquidity {
        id
        marketId {
          id
        }
        sender {
          id
        }
        transactionHash
        timestamp
        collateral
        lpTokens
        outcomes {
          id
        }
      }
      trades {
        id
        marketId {
          id
        }
        user
        outcome
        collateral
        price
        shares
        timestamp
        transactionHash
      }
    }
  }
`;

const ParaShareToken_fields = gql`
  fragment ParaShareToken_fields on ParaShareToken {
    id
    cash {
      id
      decimals
      symbol
    }
  }
`;

const HistoricMarket_fields = gql`
  fragment HistoricMarket_fields on Market {
    id
    description
    endTimestamp
    status
    amms {
      ...AMM_common
      ...AMM_enters
      ...AMM_exits
      ...AMM_swaps
    }
  }
  ${AMM_common}
  ${AMM_enters}
  ${AMM_exits}
  ${AMM_addLiquidity}
  ${AMM_removeLiquidity}
`;

export const GET_MARKETS = (block) => gql`
  query getMarkets($marketType: MarketType = YES_NO) {
    markets(where: { marketType: $marketType, description_not: null, fee_lte: 20000000000000000 }) {
      ...CurrentMarket_fields
    }
    past: markets(block: { number: ${block}}, where: { marketType: $marketType, description_not: null }) {
      ...HistoricMarket_fields
    }
    paraShareTokens {
      ...ParaShareToken_fields
    }
  }
  ${CurrentMarket_fields}
  ${HistoricMarket_fields}
  ${ParaShareToken_fields}
`;

export const ETH_PRICE = gql`
  query bundles($networkId: String, $block: Block_height) {
    bundles(where: { id: $networkId }, block: $block) {
      id
      ethPrice
    }
  }
`;

export const TOKEN_SEARCH = gql`
  query tokens($value: String, $id: String) {
    asSymbol: tokens(where: { symbol_contains: $value }, orderBy: totalLiquidity, orderDirection: desc) {
      id
      symbol
      name
      totalLiquidity
    }
    asName: tokens(where: { name_contains: $value }, orderBy: totalLiquidity, orderDirection: desc) {
      id
      symbol
      name
      totalLiquidity
    }
    asAddress: tokens(where: { id: $id }, orderBy: totalLiquidity, orderDirection: desc) {
      id
      symbol
      name
      totalLiquidity
    }
  }
`;

export const CASH_TOKEN_DATA = gql`
  query tokenDayDatas($tokenAddr: String!) {
    tokenDayDatas(first: 1, orderBy: date, orderDirection: desc, where: { token: $tokenAddr }) {
      id
      date
      priceUSD
    }
  }
`;

export const LIQUIDITIES = gql`
  query Liquidity {
    liquidities(first: 5) {
      id
      collateral
      lpTokens
      marketFactory
      user
      recipient
    }
  }
`;
