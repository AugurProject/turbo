import { task, types } from "hardhat/config";

import "hardhat/types/config";
import { buildContractInterfaces, ContractInterfaces } from "..";

task("setTrustedResolution", "Set turbo resolution for the TrustedArbiter")
  .addParam("turbo", undefined, undefined, types.int)
  .addParam("outcomes", undefined, undefined, types.json)
  .setAction(async ({ turbo, outcomes }, hre) => {
    if (typeof turbo !== "number") return;
    if (!Array.isArray(outcomes))
      throw Error(`Outcomes must be an array of strings that represent numbers, not ${outcomes}`);
    const { ethers } = hre;

    const [signer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const contracts: ContractInterfaces = buildContractInterfaces(signer, network.chainId);
    const { TrustedArbiter } = contracts;
    await TrustedArbiter.setTurboResolution(turbo, outcomes);
    const turboResolution = await TrustedArbiter.getTurboResolution(turbo);
    console.log(`Set trusted resolution: ${turboResolution}`);
  });
