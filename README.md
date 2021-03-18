# How To Use
```shell
yarn && yarn build # gets dependencies and builds everything: contracts, then generated files, then the whole project
yarn test # runs all project tests
```

Want to test deploying?
You can test deploy against the internal test environment: `yarn smart contracts:deploy`

Want to test a deploy you can actually interact with?
First start a local ethereum node: `yarn smart ethereumNode`
Then in another terminal: `yarn smart contracts:deploy --network localhost`

Want to deploy to kovan?
```shell
PRIVATE_KEY=$yourPrivateKeyHere yarn smart contracts:deploy --network kovan
```

Oh, now you want to verify your contracts on etherscan?
You will need an etherscan api key, so get one.
```shell
ETHERSCAN_API_KEY=$yourEtherscanAPIKey yarn smart contracts:verify --network kovan $contractAddress $firstConstructorArg $secondConstructorArg
```
(This process will be automated further, to apply to most or all of the deployed contracts without needing to know their constructor arguments.)