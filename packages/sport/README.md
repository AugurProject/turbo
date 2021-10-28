# Augur Sport

Augur Sport is the Augur Sportsbook UI. Sportsbook is designed to mimmick a more traditional sportsbook experience. Unlike [Augur Simplified](../simplified/README.md), the available actions a user can take are limited to trading outcomes of sporting events that have liquid markets and cashing out winning shares. Illiquid Sports Markets **will not** appear to the user on the Sportsbook. You can not provide or remove liquidity on the Augur Sportsbook, that can only be done through Augur Simplified.

## Developing

In order to work with the Augur Sport UI locally you will first need to run the `build` command at the top level directory. Once the build command completes you then run the [Augur Comps](../comps/README.md) commands `types:watch` and `transpile:watch`. Please see the [Augur Comps README.md](../comps/README.md) for more information. Once those commands are watching files in Augur Comps you can run the following command to start a locally hosted version of the Augur Sports UI:

```
yarn sport start
```

The default port is 3000, if this is taken the script will prompt the user to try 3001. Now any changes you make to the code will be watched, rebuilt, and refreshed for you in your browser.

