# Augur Simplified

Augur Simplified is the default "Turbo" UI. Users are able to provide liquidity, trade on markets, mint complete sets, claim winnings, and keep track of their portfolio. Unlike the [Augur Sport UI (Augur Sportsbook)](../sport/README.md), which is limited to trading and cashing out shares on liquid sports markets, Augur Simplified provides the user with the most options to interact with the Augur Contracts.

## Developing

In order to work with the Augur Simplified UI locally you will first need to run the `build` command at the top level directory. Once the build command completes you then run the [Augur Comps](../comps/README.md) commands `types:watch` and `transpile:watch`. Please see the [Augur Comps README.md](../comps/README.md) for more information. Once those commands are watching files in Augur Comps you can run the following command to start a locally hosted version of the Augur Simplified UI:

```
yarn simp start
```

The default port is 3000, if this is taken the script will prompt the user to try 3001. Now any changes you make to the code will be watched, rebuilt, and refreshed for you in your browser.

## Assets

The Assets folder contains fonts, images, and most importantly the styles folder. The Styles folder contains the UI wide variables like theme coloring and some sizing for things such as a gutter size for the overall page.