import { task } from "hardhat/config";
task("verifyDeploy", "Verify contract deploy")
  .addParam("addresses", "Deployed addresses")
  .addParam("account", "The account's address")
  .setAction(async (args, hre) => {
    const deployedAddresses = JSON.parse(args.addresses);
    const { collateral, reputationToken, balancerFactory, hatcheryRegistry, ammFactory } = deployedAddresses;
    const account = args.account;

    if (collateral) {
      console.log("verify::collateral", collateral);
      await hre.run("verify:verify", {
        address: collateral,
        constructorArguments: ["USDC", "USDC", 6],
      });
    }

    if (reputationToken) {
      console.log("verify::reputationToken", reputationToken);
      await hre.run("verify:verify", {
        address: reputationToken,
        constructorArguments: ["REPv2", "REPv2", 18],
      });
    }

    if (balancerFactory) {
      console.log("verify::balancerFactory", balancerFactory);
      await hre.run("verify:verify", {
        address: balancerFactory,
      });
    }

    if (hatcheryRegistry) {
      console.log("verify::hatcheryRegistry", hatcheryRegistry);
      await hre.run("verify:verify", {
        address: hatcheryRegistry,
        constructorArguments: [account, reputationToken],
      });
    }

    if (ammFactory) {
      console.log("verify::ammFactory", ammFactory);
      await hre.run("verify:verify", {
        address: ammFactory,
        constructorArguments: [balancerFactory],
      });
    }
  });
