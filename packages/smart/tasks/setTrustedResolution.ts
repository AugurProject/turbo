import { task, types } from "hardhat/config";

import "hardhat/types/config";
import { buildContractInterfaces, ContractInterfaces } from "..";
import { sleep } from "../src/util";
import { makeSigner } from "./deploy";

task("setTrustedResolution", "Set turbo resolution for the TrustedArbiter")
  .addParam("turbo", undefined, undefined, types.int)
  .addParam("outcomes", undefined, undefined, types.json)
  .setAction(async ({ turbo, outcomes }, hre) => {
    if (!Array.isArray(outcomes) || outcomes.some(isNaN))
      throw Error(`Outcomes must be an array of strings that represent numbers, not ${outcomes}`);
    const { ethers } = hre;

    const signer = await makeSigner(hre);
    const network = await ethers.provider.getNetwork();
    const contracts: ContractInterfaces = buildContractInterfaces(signer, network.chainId);
    const { TrustedArbiter } = contracts;
    await TrustedArbiter.setTurboResolution(turbo, outcomes);
    await sleep(10000);
    const turboResolution = await TrustedArbiter.getTurboResolution(turbo);
    console.log(`Set trusted resolution: ${turboResolution}`);
  });
