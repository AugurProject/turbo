# How To Use

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
You can test deploy against the internal test environment.
```shell
yarn smart contracts:deploy
```

Want to test a deploy you can actually interact with?
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