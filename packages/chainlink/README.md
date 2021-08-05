# Augur Chainlink testnet infrastructure 

This directory is for running a chainlink node for testing the adapter. Both in AWS and locally.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

 * `yarn build`   compile typescript to js
 * `yarn watch`   watch for changes and compile
 * `yarn test`    perform the jest unit tests
 * `yarn deploy:aws` To synth and deploy Cloudformation updates 
 * `yarn build:docker` To build and push docker containers this deploy depends on
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
 
## Local docker-compose setup
1. Create environment files. They're listed below.
2. Run `docker-compose up`.
   You may have to install python packages. It will show you which if it errors.
3. Go to https://localhost:6688 to load the app.
   email: `team@forecastfoundation.org`
   password: `PASSword123!!!`

### Required Files

#### augur-adapter.env
Contains these, with values after the = sign.
The RPC_URL is an http/https link.

    PRIVATE_KEY=
    RPC_URL=
    THERUNDOWN_API_KEY=
    SPORTSDATAIO_MMA_STATS_API_KEY=
    SPORTSDATAIO_NFL_SCORES_API_KEY=

#### augur-jobs-creator.env
Contract addresses from `addresses.ts`.

    CRYPTO_MARKET_FACTORY=
    MLB_MARKET_FACTORY=
    MMA_MARKET_FACTORY=
    NBA_MARKET_FACTORY=

#### chainlink-node.env
Contains the ETH_URL and the network id, URL must be a wss link.

    ETH_URL=
    ETH_CHAIN_ID=80001

# Tips & Troubleshooting

- When you change the adapter code and rerun `docker-compose up`, the adapter is NOT rebuilt.
  Run `docker-compose build augur-adapter` to rebuild it.
- Job descriptions that are automatically added live here in the `docker/jobs_creator/templates` directory. Any adjustments will require you to rebuild the image.
- The docker-compose.yml file assumes you checked out the external-adapters-js repo in the same directory as turbo.
  Like `projects/turbo/chainlink` and `projects/external-adapters-js`.
  If that isn't so then change `services.augur-adapter.build.context`.
- We use a specific version for `services.node.image` because latest is designed not to work.
  You may need to find the most recent
  [here](https://hub.docker.com/r/smartcontract/chainlink/tags?page=1&ordering=last_updated).
- Each MarketFactory specifies the address allowed to create and resolve markets.
  When deploying, this is specified in turbo in `packages/smart/hardhat.config.ts`,
  under `config.networks.*.deployConfig.linkNode`. For testing, replace `*` with `maticMumbai`.
  This needs to be set to the address of the `PRIVATE_KEY` envvar set in `augur-node.env`.
  If omitted for hardhat config during deploy, the link node defaults to the deployer.
  





