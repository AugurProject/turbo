[![Packages CI](https://github.com/AugurProject/turbo/actions/workflows/node.js.yml/badge.svg)](https://github.com/AugurProject/turbo/actions/workflows/node.js.yml)

# How Do I Use This?

First get dependencies and build everything.
(Everything. Contracts, generated files, then finally the typescript itself.)

```shell
yarn && yarn build
```

Now if you want to, run all the tests:

```shell
yarn test
```

Want to test deploying?
First start a local ethereum node:

```shell
yarn smart ethereumNode
```

Then in another terminal:

```shell
yarn smart contracts:deploy --network localhost
```

Want to deploy to kovan?

```shell
PRIVATE_KEY=$yourPrivateKeyHere yarn smart contracts:deploy --network kovan
```

Oh, now you want to verify your contracts on etherscan?
You will need an etherscan api key, so get one.
Then run this bad boy:

```shell
ETHERSCAN_API_KEY=$yourEtherscanAPIKeyHere yarn smart contracts:verify --network kovan $contractAddress $firstConstructorArg $secondConstructorArg
```

(This process will be automated further, to apply to most or all of the deployed contracts without needing to know their constructor arguments.)

# Want To Write Code?

## UI
 prereqs, yarn and node installed. 
 To run the UI against polygon (networkId 137) or mumbai (networkId 80001). use `DEFAULT_NETWORK` to set the networkId the UI will use. To get started first, `git pull`, for convenience we'll use `dev` branch for this example.

```
git pull
git checkout dev
yarn
yarn build
DEFAULT_NETWORK=137 yarn simp start
```

### Advance dev
If making code changes in Comps, it's convenient to have watchers running in separate shells to keep comps updated and simply refresh the UI.
`yarn comps transpile:watch` and `yarn comps types:watch`

### Example code change
If you would like to change the default rpc endpoints or add you own RPC endpoint, change the list in this file
 - update rpc list in `packages/comps/src/components/ConnectAccount/constants/index.tsx`
 ```
 export const MATIC_RPCS = ['https://polygon-rpc.com/', ...
 ```
 
Then build and run the UI:
```
yarn build && DEFAULT_NETWORK=137 yarn simp start
```
## Misc
This repo uses eslint with a few options and prettier with 120 columns.
Before committing any code, please run prettier:

```shell
yarn format:write
```

Then run the linter:

```shell
yarn lint
```

# Documentation

Documentation is available at https://turbo-docs.augur.sh/
