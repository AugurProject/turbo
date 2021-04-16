import { task } from "hardhat/config";

import "hardhat/types/config";
import { buildContractInterfaces, ContractInterfaces } from "..";
import { makeSigner } from "./deploy";
import { packJobId, sleep } from "../src/utils/common-functions";
import { HttpNetworkUserConfig } from "hardhat/types/config";

task("requestScore", "Request and set score in TheRundownChainlink").setAction(async (args, hre) => {
  const { ethers } = hre;
  const { linkOracleAddress, linkJobID } = hre.network.config as HttpNetworkUserConfig;
  const signer = await makeSigner(hre);
  const network = await ethers.provider.getNetwork();
  const contracts: ContractInterfaces = buildContractInterfaces(signer, network.chainId);
  const { TheRundownChainlink } = contracts;
  await TheRundownChainlink.requestScore("2fc5fdbdea181a1b38eee8dc49072043", linkOracleAddress, packJobId(linkJobID));
  let score;
  for (let i = 0; i < 60; i++) {
    score = await TheRundownChainlink.score();
    await sleep(5000);
    if (score.toNumber() > 0) break;
  }
  console.log("score", score);
});
