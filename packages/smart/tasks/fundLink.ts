import { task, types } from "hardhat/config";
import { ContractTransaction, BytesLike } from "ethers";

import "hardhat/types/config";
import { buildContractInterfaces, ContractInterfaces } from "..";
import { makeSigner } from "./deploy";
import { sleep } from "../src/utils/common-functions";

task("fundLink", "Send 100 link to a contract on kovan")
  .addParam("contract", undefined, undefined, types.string)
  .setAction(async ({contract: contractAddress}, hre) => {
    if (typeof contractAddress !== "string") return;
    const { ethers } = hre;
    const signer = await makeSigner(hre);
    const link = await ethers.getContractAt("link", "0xa36085F69e2889c224210F603D836748e7dC0088", signer);
    console.log("contract", link); 
    //0xa36085F69e2889c224210F603D836748e7dC0088
    // add seperate hardhat task to fund link to rundown contract
    // need this, or at least cnt use public

  });
