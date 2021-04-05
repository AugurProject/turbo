import { task, types } from "hardhat/config";

import "hardhat/types/config";
import { buildContractInterfaces, ContractInterfaces } from "..";
import { makeSigner } from "./deploy";
import { sleep } from "../src/utils/common-functions";

// Payment Amount: 0.1 LINK
// LINK Token Address: 0xa36085F69e2889c224210F603D836748e7dC0088
// Oracle Address: 0x56dd6586DB0D08c6Ce7B2f2805af28616E082455
// JobID: dbb65efc02d34cddb920eca1bec22ade

task("requestScore", "Request and set score in TheRundownChainlink")
  .setAction(async ({}, hre) => {
    const { ethers } = hre;

    const signer = await makeSigner(hre);
    const network = await ethers.provider.getNetwork();
    const contracts: ContractInterfaces = buildContractInterfaces(signer, network.chainId);
    const { TrustedArbiter } = contracts;
    // await TrustedArbiter.setTurboResolution(turbo, outcomes);
    // await sleep(10000);
    // const turboResolution = await TrustedArbiter.getTurboResolution(turbo);
    //console.log(`Set trusted resolution: ${turboResolution}`);
  });
