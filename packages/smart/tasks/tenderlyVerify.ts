import { task } from "hardhat/config";
import { addresses, ChainId } from "../addresses";

task("tenderly:verify:all", "Push contracts to tenderly", async (args, hre) => {
  const { chainId } = await hre.ethers.provider.getNetwork();

  const deployedAddresses = addresses[chainId as ChainId];
  if (!deployedAddresses) return;

  await hre.tenderly.verify([
    {
      name: "AMMFactory",
      address: deployedAddresses.ammFactory,
    },
    {
      name: "BFactory",
      address: deployedAddresses.balancerFactory,
    },
    {
      name: "Reputation",
      address: deployedAddresses.reputationToken,
    },
  ]);
});
