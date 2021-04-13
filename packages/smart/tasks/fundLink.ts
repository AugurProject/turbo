import { task, types } from "hardhat/config";

import "hardhat/types/config";
import { makeSigner } from "./deploy";
import { LinkTokenInterface__factory } from "../typechain";

task("fundLink", "Send 100 link to a contract on kovan")
  .addParam("contract", undefined, undefined, types.string)
  .setAction(async ({ contract: contractAddress }, hre) => {
    if (typeof contractAddress !== "string") return;
    const { ethers } = hre;
    const signer = await makeSigner(hre);

    const linkTokenAddress = "0xa36085F69e2889c224210F603D836748e7dC0088";
    const amount = ethers.BigNumber.from(10).pow(18);
    const linkToken = LinkTokenInterface__factory.connect(linkTokenAddress, signer);

    await linkToken.transfer(contractAddress, amount).then((tx: any) => {
      tx.wait();
      console.log("Contract ", contractAddress, " funded with LINK. Transaction Hash: ", tx.hash);
    });
  });
