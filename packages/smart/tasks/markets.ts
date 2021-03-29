import { task } from "hardhat/config";
import { buildContractInterfaces, ContractInterfaces } from "..";

task("markets", "retreive markets").setAction(async (args, hre) => {
  console.log("get markets data");
  const { ethers } = hre;
  // determine if contracts have been deployed
  // get turboHatchery to create market on
  // create market
  //const Greeter = await hre.ethers.getContractFactory("Greeter");
  const [signer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  const contracts: ContractInterfaces = buildContractInterfaces(signer, network.chainId);
  const { Hatchery, TrustedArbiter } = contracts;

  const turbos = await Hatchery.getTurboLength();
  const totalTurbos = turbos.toNumber();
  for (let i = 0; i < totalTurbos; i++) {
    const data = await TrustedArbiter.turboData(i);
    console.log("data", data);
  }
});
