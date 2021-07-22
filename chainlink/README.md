This directory is for running a chainlink node for testing the adapter.

# Setup
1. Create several files containing secrets. They're listed below.
2. Run `docker-compose up`. 
   You may have to install python packages. It will show you which if it errors.
3. Go to https://localhost:6688 to load the app. Sign in or sign up, as needed.
4. Create a bridge:

| Field                    | Value                      |
| ------------------------ | -------------------------- |
| Bridge Name              | augur-adapter              |
| Bridge URL               | https://augur-adapter:8080 |
| Minimum Contract Payment | 0                          |
| Confirmations            | 0                          |

5. Create a job. The example here won't quite work as-is so see the
   [docs](https://github.com/AugurProject/external-adapters-js/blob/develop/packages/composites/augur/README.md)
   for details.
```json
{
  "name": "augur-test-00-mlb-create",
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

## .api
This is the initial user/password for the api and gui login. This file contains two lines: username/email and password.

## .password
Contains a password for the keystore. Can be anything on a single line.

## augur-adapter.env
Contains these, with values after the = sign.
The PRIVATE_KEY doesn't need to match the node's secret.
The RPC_URL is an http/https link.

    PRIVATE_KEY=
    RPC_URL=
    THERUNDOWN_API_KEY=

## chainlink-node.env
Contains just the ETH_URL, which must be a wss link.

    ETH_URL=

## secret
Not sure what this holds.
Chainlink may tell you to make this file's permissions very restricted but that isn't actually necessary.

# Tips & Troubleshooting

- When you change the adapter code and rerun `docker-compose up`, the adapter is NOT rebuilt.
  You can either delete the image to force rebuild or increment the image version in `services.augur-adapter.image`.
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
  
