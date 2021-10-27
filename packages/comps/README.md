# Augur Comps

Augur Comps are a collection of react components, react hooks, contract calls, and generally shared code between the two Augur Turbo UIs: Simplified UI (aka Augur Turbo) and the Sports UI (aka Augur Sportsbook).

## General Use
When developing locally, you will want to run two commands for augur comps to ensure it watches and updates any changes you make to the UI. These commands should be run from the top level `augur` folder:

```yarn comps types:watch```

and

```yarn comps transpile:watch```.

Once these commands are watching the comps folder, any updates you make to comps will rebuild the file you changed and reload the UI. This is a great help when trying to implement a new feature or fix a bug in the UI.


## How to Import Comps
In the index.tsx file we export any tools or components we plan to expose to the Augur UIs. Some things are exported in more than one spot for convience when importing multiple pieces of Augur Comps into an Augur UI. So you may find it easier to do something like this:

```
import { useDataStore } from '@augurproject/comps'
```

or you may choose the alternate import if you plan to import multiple things from the Stores section of Comps:

```
import { Stores } from '@augurproject/comps'
const {
  useDataStore,
  useUserStore,
  useAppStatus,
} = Stores;
```

Whichever import you choose is really dependant on personal preference/code style, either one will provide you with the same `useDataStore` hook in this example, with the second example also providing additional hooks.

## Apollo
The Apollo folder contains code used to describe queries used in the UIs and connection code for connecting to the Augur Subgraph. This data is used to populate historical information like profit and loss of an older trade for example.

## Assets
The Assets folder contains shared fonts, images, and baseline shared styles across the UIs. Things like theme colors and preset responsive breakpoints are setup here.

## Components
The Components folder contains common components used across both UIs. Examples include dropdown menus, buttons, labels, the connect account area, and more.

## Stores
The Stores folder contains hooks and stores that are shared across both UIs. An example would be the User Store which contains information related to the logged in user, like their balances or approval status for a certain action. Some of these stores assume a certain order or that other stores will exist. User and Data for example interact in this way where the data store expects the User Store to be present as well as AppStatusStore. The stores are roughly broken up into logical seperation of concerns. App Status Store cares about things like are we logged in, are we in a mobile view, do we have an modals showing -- etc. Things that are agnostic to the UI but are genrally things you may want to track for various interactions or ui states. Data Store is where you will find things like Markets, Market Transactions, AMMs, etc.

## Utils
The Utils folder contains various utility functions ranging from date manipulation, to formatting cash values for display, to processing data from the calls to the fetcher. Utils also contains shared link function for the various UIs as well as the Link components. You can also find the `contract-calls.ts` in the Utils folder. Please refer to the [README.md](src/utils/README.md) in `src/utils/` in order to learn more about the various Contract Calls available.

