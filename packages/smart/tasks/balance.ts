import { task } from "hardhat/config";

task("balance", "Prints an account's balance")
  .addParam("account", "The account's address")
  .setAction(async (args, hre) => {
    const { ethers } = hre;
    const provider = ethers.getDefaultProvider();
    const isAddress = ethers.utils.isAddress(args.account);
    if (!isAddress) throw new Error(`${args.account} is not a valid address`);
    const account = ethers.utils.getAddress(args.account);
    const balance = await provider.getBalance(account);
    console.log(ethers.utils.formatEther(balance));
  });
