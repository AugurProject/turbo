import { task } from "hardhat/config";
import { sleep, swapFee } from "../src";
import { Addresses } from "../addresses";

task("verifyDeploy", "Verify contract deploy")
  .addParam("addresses", "Deployed addresses")
  .addParam("account", "The account's address")
  .setAction(async (args, hre) => {
    const deployedAddresses = JSON.parse(args.addresses) as Addresses;
    const { reputationToken, balancerFactory, marketFactories, ammFactory, theRundownChainlink } = deployedAddresses;

    let collaterals: { [address: string]: boolean } = {};
    if (marketFactories) {
      for (const [name, marketFactory] of Object.entries(marketFactories)) {
        console.log(`verify::marketFactory::${name}`);
        await hre.run("verify:verify", {
          address: marketFactory.address,
          constructorArguments: marketFactory.constructorArgs,
        });
        await rateLimit();
        const { collateral } = marketFactory;
        if (!collaterals[collateral.address]) {
          collaterals[collateral.address] = true;
          console.log(`verify::collateral::${collateral.name}`);
          await hre.run("verify:verify", {
            address: collateral.address,
            constructorArguments: [collateral.name, collateral.symbol, collateral.decimals],
          });
          await rateLimit();
        }
      }
    }

    if (reputationToken) {
      console.log("verify::reputationToken", reputationToken);
      await hre.run("verify:verify", {
        address: reputationToken,
        constructorArguments: ["REPv2", "REPv2", 18],
      });
      await rateLimit();
    }

    if (balancerFactory) {
      console.log("verify::balancerFactory", balancerFactory);
      await hre.run("verify:verify", {
        address: balancerFactory,
      });
      await rateLimit();
    }

    if (ammFactory) {
      console.log("verify::ammFactory", ammFactory);
      await hre.run("verify:verify", {
        address: ammFactory,
        constructorArguments: [balancerFactory, swapFee],
      });
      await rateLimit();
    }

    if (theRundownChainlink) {
      console.log("verify::theRundownChainlink", theRundownChainlink);
      await hre.run("verify:verify", {
        address: theRundownChainlink,
      });
      await rateLimit();
    }
  });

async function rateLimit() {
  await sleep(200); // 5 per second
}