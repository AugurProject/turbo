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

export const GET_LATEST_BLOCK = gql`
  query blocksAround {
    blocks(orderBy: timestamp, orderDirection: desc) {
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

export const GET_MARKETS = gql`
  query {
    teamSportsMarkets(where: { winner: null }, orderBy: timestamp, orderDirection: desc) {
      marketId: id
      creationTimestamp: timestamp
      endTime
      winner
      eventId
      homeTeamId
      awayTeamId
      marketType
      value0: overUnderTotal
      estimatedStartTime
      marketFactoryAddress: marketFactory
      turboId: marketIndex
      shareTokens
      creator
      initialOdds
    }
    cryptoMarkets(where: { winner: null }, orderBy: timestamp, orderDirection: desc) {
      marketId: id
      marketFactoryAddress: marketFactory
      turboId: marketIndex
      creationTimestamp: timestamp
      endTime
      winner
      creationPrice
      marketType
      coinIndex
      shareTokens
      creator
      initialOdds
    }
    mmaMarkets(where: { winner: null }, orderBy: timestamp, orderDirection: desc) {
      marketId: id
      marketFactoryAddress: marketFactory
      turboId: marketIndex
      creationTimestamp: timestamp
      estimatedStartTime
      endTime
      eventId
      homeFighterName
      awayFighterName
      homeFighterId
      awayFighterId
      winner
      shareTokens
      creator
      marketType
      initialOdds
    }
    resolved_teamSportsMarkets: teamSportsMarkets(
      where: { winner_not: null }
      orderBy: timestamp
      orderDirection: desc
    ) {
      marketId: id
      creationTimestamp: timestamp
      endTime
      winner
      eventId
      homeTeamId
      awayTeamId
      marketType
      value0: overUnderTotal
      estimatedStartTime
      marketFactoryAddress: marketFactory
      turboId: marketIndex
      shareTokens
      creator
    }
    resolved_cryptoMarkets: cryptoMarkets(where: { winner_not: null }, orderBy: timestamp, orderDirection: desc) {
      marketId: id
      marketFactoryAddress: marketFactory
      turboId: marketIndex
      creationTimestamp: timestamp
      endTime
      winner
      creationPrice
      marketType
      coinIndex
      shareTokens
      creator
    }
    resolved_mmaMarkets: mmaMarkets(where: { winner_not: null }, orderBy: timestamp, orderDirection: desc) {
      marketId: id
      marketFactoryAddress: marketFactory
      turboId: marketIndex
      creationTimestamp: timestamp
      estimatedStartTime
      endTime
      eventId
      homeFighterName
      awayFighterName
      homeFighterId
      awayFighterId
      winner
      shareTokens
      creator
      marketType
    }
  }
`;

export const GET_TRANSACTIONS = gql`
  query getTransactions($account: String) {
    senders(where: { id: $account }) {
      positionBalance(where: { open: false }) {
        id
        hasClaimed
        positionFromAddLiquidity
        positionFromRemoveLiquidity
        timestamp
        transactionHash
        outcomeId
        avgPrice
        initCostUsd: initCostUsdBigDecimal
        shares: sharesBigDecimal
        payout: payoutBigDecimal
        totalChangeUsd
        settlementFee
        marketId
        open
      }
      claimedFees {
        id
        collateral
        timestamp
        transactionHash
        receiver
      }
      claimedProceeds {
        id
        fees
        outcome
        marketId {
          id
        }
        timestamp
        transactionHash
        payout
        sender {
          id
        }
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
        totalSupply
        sharesReturned
      }
      removeLiquidity {
        id
        marketId {
          id
        }
        sender {
          id
        }
        sharesReturned
        transactionHash
        timestamp
        collateral
        lpTokens
        totalSupply
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
      sender {
        id
      }
      recipient
    }
  }
`;
