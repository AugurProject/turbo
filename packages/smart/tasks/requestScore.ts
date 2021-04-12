import { task, types } from "hardhat/config";
import { ContractTransaction, BytesLike } from "ethers";

import "hardhat/types/config";
import { buildContractInterfaces, ContractInterfaces } from "..";
import { makeSigner } from "./deploy";
import { sleep } from "../src/utils/common-functions";

// Payment Amount: 0.1 LINK
// LINK Token Address: 0xa36085F69e2889c224210F603D836748e7dC0088
// Oracle Address: 0x56dd6586DB0D08c6Ce7B2f2805af28616E082455
// JobID: dbb65efc02d34cddb920eca1bec22ade / 0x6462623635656663303264333463646462393230656361316265633232616465

task("requestScore", "Request and set score in TheRundownChainlink")
  .setAction(async ({}, hre) => {
    const { ethers } = hre;

    const signer = await makeSigner(hre);
    const network = await ethers.provider.getNetwork();
    const contracts: ContractInterfaces = buildContractInterfaces(signer, network.chainId);
    const { TheRundownChainlink } = contracts;
    
    // add seperate hardhat task to fund link to rundown contract
    // need this, or at least cnt use public

    // await TheRundownChainlink.setChainlinkTokenAddress("0xa36085F69e2889c224210F603D836748e7dC0088");
    // await sleep(10000);
    // kovan.chain.link
    // https://docs.chain.link/docs/acquire-link#config
    // account needs link, call link.transferAndCall, need to add tokens to rundownchainlink
 
    //  need request to
    //try putting job id in contract cause bytes 32 thing might be off
    await TheRundownChainlink.requestScore("2fc5fdbdea181a1b38eee8dc49072043");
    await sleep(10000);
    const score = await TheRundownChainlink.score();
    console.log("score", score);
  });
