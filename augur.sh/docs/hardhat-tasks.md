---
title: Hardhat Tasks
slug: /tasks
---

# Hardhat Tasks

Augur Turbo takes advantage of Hardhat to handle smart contract development,
and comes pre-packaged with a variety of useful tasks for interacting with the
Augur contracts.

The source for these tasks are all available in the [packages/smart/tasks
](https://github.com/AugurProject/turbo/tree/dev/packages/smart/tasks) directory.


## Utilities

There are a variety of utility tasks available, for instance:
```bash
# Print the list of accounts
yarn hardhat accounts

# Print an account's balance
yarn hardhat --account [account address]
```

To get a complete list run:
```bash
yarn hardhat
```

## Selecting a network

Default network settings are registered to allow you to select a network. These
are defined in
[packages/smart/hardhat.config.ts](https://github.com/AugurProject/turbo/tree/dev/packages/smart/hardhat.config.ts).
The `--network` argument can be used with hardhat tasks to direct the task to
connect to a specific network.

```bash
yarn hardhat [task] --network [kovan|mumbai|arbitrum|...]
```

## Specifying a private key

To deploy to anywhere but hardhat or localhost, you must provide a private key using an environment variable like so:
```bash
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 yarn hardhat --network kovan deploy
```

Or you may export the environment variable into your shell's ENV list:
```bash
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
yarn hardhat --network kovan deploy
```

## Canned Markets
A variety of test markets can be created by using the `cannedMarkets`
task. This is useful for both local and testnet deploys, allowing you to
start with a list of markets that is consistent.

```bash
yarn hardhat cannedMarkets
```

## The Rundown
We are adding tasks to make it easy to fetch data from TheRunDown. In order to
use these you will need a rundown api key from rapidapi.

```
yarn hardhat fetch-rundown-event --event [eventId] --key [rundownApiKey]
```

## Fund link
This task funds an address with 1 LINK.

```
yarn hardhat fundLink --contract [contractAddress]
```