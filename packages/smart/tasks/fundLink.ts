import { task, types } from "hardhat/config";

import "hardhat/types/config";
import { makeSigner } from "./deploy";
import { LinkTokenInterface__factory } from "../typechain";
import { HttpNetworkUserConfig } from "hardhat/types/config";

task("fundLink", "Send 1 link to a contract on kovan")
  .addParam("contract", undefined, undefined, types.string)
  .setAction(async ({ contract: contractAddress }, hre) => {
    if (typeof contractAddress !== "string") return;
    const { ethers } = hre;
    const signer = await makeSigner(hre);
    
    const { linkAddress } = hre.network.config as HttpNetworkUserConfig;
    const amount = ethers.BigNumber.from(10).pow(18);
    const linkToken = LinkTokenInterface__factory.connect(linkAddress, signer);

    await linkToken.transfer(contractAddress, amount).then((tx: any) => {
      tx.wait();
      console.log("Contract ", contractAddress, " funded with LINK. Transaction Hash: ", tx.hash);
    });
  });
