# Contract Interactions
Contract interactions occur in contract-calls.ts. There was an effort to keep them all in one place with data processing methods so that little shaping was needed in other parts of the UI. There are two types of contract calls:
 - multicall
 - calls using hardhard objects 

## Getting user data
`getUserBalances` is the only place multicall is used. `ethereum-multicall` package is a modified version of the open source project with the same name. Locally there are modifications to fix issues with newer version of ethers. 

User balances pulled:
 - Amm liquidity provider tokens
 - Pending rewards
 - Market outcome shares
 - USDC balance
 - MATIC balance
 - Allowances aka Approvals (only used in sportsbook)

## Getting market and amm data
`getMarketInfos` method is the integration point with react state called from `data.tsx`. Fetcher contracts are convenience contracts that help reduct the number of contract calls needed to pull all market and amm data. The helper contracts called `fetchers`. These fetchers pull down market and amm data, the data structure is made up of base properties that are common across all markets and specific market type properties. 

Market types are:
- NFL, national football league.
- NBA, national baseball assoc.
- MMA, mixed martial arts (UFC)
- MLB, major league baseball
- CRYPTO, crypto currency price markets
- GROUPED, futures - multiple generic markets grouped together (not fully implemented)

Fetcher files and associated market types:

| File name | Description |
| ---- | ---- |
| `fetcher-sport.ts` | gets data for NFL, MMA, MLB and NBA markets | 
| `fetcher-crypto.ts` | gets data for crypto markets | 
| `fetcher-grouped.ts` | gets data for grouped markets | 

Helpers are used to shape market type specific data:

| MARKET TYPE | FILE NAME |
------------- | --------------
| SPORTSLINK (used in older versions of the UI)| `derived-simple-sport-dailies`|
| CRYPTO | `derived-crypto-markets.ts`|
| MMA, MMALINK (used in older versions of the UI) | `derived-mma-dailies.ts`|
| MLB, NBA, NFL | `derived-nfl-dailies.ts`|
| GROUPED | `derived-grouped-data.ts`|

The shaped market and amm data is returned to data.tsx to be stored in state. 


## Trading (buy, sell)
Trading has two aspects, the estimation and the actual contract call. Estimations are fast off chain calls, that tells the user the amount of market outcome shares they will get given USDC. 

`doTrade` method in contract-calls.ts handels both buy and sell. Amm factory contract is called for the user to either buy (`buy`) or sell (`sellForCollateral`). The amm factory contract address is on the AmmExchange object for the market. 

Minting complete sets `mintCompleteSets` is a way the user can convert USDC to market shares outcome tokens. The user can only mint complete sets before a market is resolved.


## Providing Liquidity
There are many aspects to Providing liquidity:
- estimations
- adding initial liquidity
- adding additional liquidity
- removing liquidity

Estimations uses static call on the contract to get estimations. This requires that the user has already approved the contracts. The UI indicates this to the user and the user has to sign a transaction to do the approval. Once the approvals are done, static calls can be used to estimate add liquidity and remove liquidity.

There is a helper method to get the rewards contract. `getRewardsContractAddress`.

```
  const rewardContractAddress = getRewardsContractAddress(amm.marketFactoryAddress);
  const rewardContract = rewardContractAddress ? getRewardContract(provider, rewardContractAddress, account) : null;
  ```

Usually Amm Factory contract would be called directly to add and remove liquidity. With rewards the master chef contract is the go-between. Methods in contract-calls still does support non-rewards add and remove liquidity.

| Method | Description |
| --- | --- |
| `createPool` | add initial liquidity |
| `addLiquidity` | add additional liquidity |
| `removeLiquidity` | remove liquidity |

## Rewards
Rewards contract "master chef" was added to track and disperse rewards to the liquidity provider. The master chef contract is a pass through to Amm Factory contract.
The user gets rewards for providing liquidity on markets, under specific circustances they get a bonus. `getUserBalances` adds calls to get pending rewards in the multicall.