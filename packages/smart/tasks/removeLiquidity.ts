import { task, types } from "hardhat/config";
import { addresses } from "../addresses";
import { AMMFactory__factory, BPool__factory } from "../typechain";
import { makeSigner } from "./deploy";

task("removeLiquidity", "Remove liquidity to AMM pool")
  .addParam("turboId", undefined, undefined, types.int)
  .setAction(async (args, hre) => {
    // Type checking mostly as hints to the compiler
    if (typeof args.turboId !== "number") return;

    const { ethers } = hre;
    const signer = await makeSigner(hre);
    const network = await ethers.provider.getNetwork();
    const contractAddresses = addresses[String(network.chainId)];
    if (!contractAddresses) return;

    const ammFactory = AMMFactory__factory.connect(contractAddresses.ammFactory, signer);
    const poolAddress = await ammFactory.pools(contractAddresses.hatchery, args.turboId);
    console.log("poolAddress", poolAddress);

    if (poolAddress === "0x0000000000000000000000000000000000000000") {
      console.log("turboId is not deployed");
      return;
    }

    const pool = BPool__factory.connect(poolAddress, signer);
    const balance = await pool.balanceOf(await signer.getAddress());

    if (balance.eq(0)) {
      console.log("No liquidity to remove");
      return;
    }

    const tx = await pool.exitPool(balance, [0, 0, 0]);
    console.log(tx);
  });
