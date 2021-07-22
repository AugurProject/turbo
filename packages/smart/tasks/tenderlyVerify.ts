import { task } from "hardhat/config";
import { addresses, ChainId, MARKET_FACTORY_TYPE_TO_CONTRACT_NAME, marketFactoryTypeToFetcherName } from "../addresses";

task("tenderly:verify:all", "Push contracts to tenderly", async (args, hre) => {
  const { chainId } = await hre.ethers.provider.getNetwork();

  const deployedAddresses = addresses[chainId as ChainId];
  if (!deployedAddresses) return console.warn(`No contracts known for chainid "${chainId}"`);

  const contracts = [
    {
      name: "BFactory",
      address: deployedAddresses.balancerFactory,
    },
    {
      name: "Reputation",
      address: deployedAddresses.reputationToken,
    },
  ];

  for (const marketFactory of deployedAddresses.marketFactories) {
    const { ammFactory, fetcher, address, type, collateral } = marketFactory;

    contracts.push({
      name: "AMMFactory",
      address: ammFactory,
    });

    // Fails to verify in production because real collateral (USDC) is used.
    contracts.push({
      name: "Cash",
      address: collateral,
    });

    contracts.push({
      name: MARKET_FACTORY_TYPE_TO_CONTRACT_NAME[type],
      address,
    });

    // Fetchers aren't always defined
    if (fetcher !== "") {
      contracts.push({
        name: marketFactoryTypeToFetcherName[type],
        address: fetcher,
      });
    }
  }

  const addrs: string[] = [];
  const uniqueContracts = contracts.filter((c) => {
    const keep = !addrs.includes(c.address);
    if (keep) addrs.push(c.address);
    return keep;
  });

  console.log(`Attempting to verify ${uniqueContracts.length} contracts for network ${chainId}.`);

  // One at a time because some will fail for various benign reasons.
  for (const contract of uniqueContracts) {
    console.log(`Verifying ${contract.name} @ ${contract.address}`);
    await hre.tenderly.verify([contract]);
  }
});
