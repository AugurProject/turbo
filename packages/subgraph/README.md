# Augur Subgraph

A subgraph is an open API, built on top of [The Graph](https://thegraph.com/en/), that indexes
and organize blockchain data, making it accessible via [GraphQL](https://graphql.org/learn/),
which is a query language for APIs.

Our subgraph is being used on both Augur Turbo and Augur Sportsbook. It's currently indexing
Augur's markets, trades, addition and removal of liquidity and also positions.

## Available Subgraphs

There are two main subgraphs that we use. Matic is our live subgraph, used for production, and
Mumbai is our test subgraph, used by developers.

[Matic](https://thegraph.com/hosted-service/subgraph/augurproject/augur-turbo-matic)

[Mumbai](https://thegraph.com/hosted-service/subgraph/augurproject/augur-turbo-mumbai)

There's also a subgraph for staging, which is a mirror of our production subgraph,
and demo.

[Matic Staging](https://thegraph.com/hosted-service/subgraph/augurproject/augur-turbo-matic-staging)

[Mumbai Demo](https://thegraph.com/hosted-service/subgraph/augurproject/augur-turbo-demo-mumbai)

## How to deploy

In order to deploy the graph you need to run these commands from the top level `augur` folder:

### 1. Build the contracts

```text
yarn smart build
```

### 2. Generate the environments

This will generate a json configuration file from the `packages/smart/addresses.ts` file. It is
going to be used to generate the `subgraph.yaml` file.

```text
yarn smart generate:environments
```

### 3. Copy the ABIs

This will copy the ABIs to the subgraph's package so that the subgraph can use them.

```text
yarn subgraph prepare:abis
```

### 4. Generate the Subgraph's configuration file

This will generate the `subgraph.yaml` file based on the network you've picked. It essentially
grabs the environment file you created on step 2, `packages/smart/environments/<NETWORK-NAME>.json`,
and builds the configuration file using [Mustache](https://mustache.github.io/), a logic-less
templating system, with the help of the template file located at
`packages/subgraph/subgraph.template.yaml`.
```text
yarn subgraph prepare:matic
OR
yarn subgraph prepare:mumbai
```

### 5. Run the codegen

This will generate usable files from the ABIs so that you can use them inside your mappings.

```text
yarn subgraph codegen
```

### 6. Deploy

In order to deploy you first have to authenticate. You just have to run this command once.

```text
graph auth https://api.thegraph.com/deploy <ACCESS_TOKEN>
```

Then you can deploy using one of the following commands:

```text
yarn subgraph deploy:matic
OR
yarn subgraph deploy:mumbai
OR
yarn subgraph deploy:staging
OR
yarn subgraph deploy:demo
```

And that's it! If everything worked, the subgraph will sync with the blockchain and in a few
minutes it's going to be working. Note that when you deploy a new version, it might take over
10 minutes to sync because it re-indexes the data from the start block that you set in the
`subgraph.yaml` file. In the meantime, you can check the progress of the graph by accessing
the playground and clicking on "Current Version" and switching it to "Pending Version".

## How to test for errors

There is a bug in The Graph's webpage that might prevent the error stacktrace from showing.
If that happens, you can find out the error logs using `curl` and running the following commands.
Don't forget to change the `<SUBGRAPH_NAME>`.

Current subgraph version:

```text
curl --location --request POST 'https://api.thegraph.com/index-node/graphql' --data-raw '{"query":"{ indexingStatusForCurrentVersion(subgraphName: \"augurproject/<SUBGRAPH_NAME>\") { subgraph fatalError { message } nonFatalErrors {message } } }"}'
```

Pending subgraph version:

```text
curl --location --request POST 'https://api.thegraph.com/index-node/graphql' --data-raw '{"query":"{ indexingStatusForPendingVersion(subgraphName: \"augurproject/<SUBGRAPH_NAME>\") { subgraph fatalError { message } nonFatalErrors {message } } }"}'
```

## Graph documentation

For more information on how The Graph works, see the docs on https://thegraph.com/docs/.

## Folders

The `src/utils.ts` file contains a few utility functions and constants.

The `src/types.ts` file contains a type that's used in a few files. Important to note:
Use `class` to add a new type object type to AssemblyScript.

### Mappings

The `src/mappings` folder contains all the information the graph needs to index information
from the blockchain. It's organized with the name of the market factory + version.

The subgraph will listen to the events emitted by the contracts, but you can also make direct
contract calls.

### Helpers

The `src/helpers` folder contains some helper methods that are used throughout the mappings.

It's important to note that you shouldn't rely on generated imports other than the
`generated/schema` inside those files, otherwise the subgraph may blow up if that ABI is not
being used. The only exception we have is the `generated/AmmFactory/AmmFactory` being imported
inside `src/helpers/CommonHandlers.ts`, because the AmmFactory is always there to be used.
