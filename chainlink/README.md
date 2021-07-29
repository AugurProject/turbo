This directory is for running a chainlink node for testing the adapter.

# Setup
1. Create environment files. They're listed below.
2. Run `docker-compose up`. 
   You may have to install python packages. It will show you which if it errors.
3. Go to https://localhost:6688 to load the app.
   email: `team@forecastfoundation.org`
   password: `PASSword123!!!`
4. Create a bridge:

| Field                    | Value                      |
| ------------------------ | -------------------------- |
| Bridge Name              | augur-adapter              |
| Bridge URL               | http://augur-adapter:8080  |
| Minimum Contract Payment | 0                          |
| Confirmations            | 0                          |

5. Create a job. The example here won't quite work as-is so see the
   [docs](https://github.com/AugurProject/external-adapters-js/blob/develop/packages/composites/augur/README.md)
   for details.
```json
{
  "name": "mlb-create",
  "initiators": [
    {
      "type": "web"
    }
  ],
  "tasks": [
    {
      "type": "augur-adapter",
      "params": {
        "sport": "mlb",
        "method": "create",
        "startBuffer": 86400,
        "affiliateIds": [
          9,
          3
        ],
        "daysInAdvance": 7,
        "contractAddress": "0x203fdF154b636D834ABC015Ca6Dc9C6127659c58"
      }
    }
  ]
}
```

# Files
Some files are created when you sign up with your node.
Others must be added.

## augur-adapter.env
Contains these, with values after the = sign.
The RPC_URL is an http/https link.

    PRIVATE_KEY=
    RPC_URL=
    THERUNDOWN_API_KEY=
    SPORTSDATAIO_MMA_STATS_API_KEY=

## chainlink-node.env
Contains just the ETH_URL, which must be a wss link.

    ETH_URL=

# Tips & Troubleshooting

- When you change the adapter code and rerun `docker-compose up`, the adapter is NOT rebuilt.
  Run `docker-compose build augur-adapter` to rebuild it.
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
  
