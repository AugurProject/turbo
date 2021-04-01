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

## Canned Markets:w
A variety of test markets can be created by using the `cannedMarkets`
task. This is useful for both local and testnet deploys, allowing you to
start with a list of markets that is consistent.

```bash
yarn hardhat cannedMarkets
```



