import { task, types } from "hardhat/config";
import { AMMFactory__factory } from "../typechain";
import { makeSigner } from "./deploy";
import { addresses } from "../addresses";

task("addLiquidity", "Add liquidity to AMM pool")
  .addParam("turboId", undefined, undefined, types.int)
  .addParam("amount", undefined, undefined, types.int)
  .setAction(async (args, hre) => {
    const { ethers } = hre;
    const network = await ethers.provider.getNetwork();

    // Type checking mostly as hints to the compiler
    if (typeof args.turboId !== "number") return;
    if (typeof args.amount !== "number") return;

    const contractAddresses = addresses[String(network.chainId)];
    if (!contractAddresses) return;

    const signer = await makeSigner(hre);
    const ammFactory = AMMFactory__factory.connect(contractAddresses.ammFactory, signer);

    const poolAddress = await ammFactory.pools(contractAddresses.hatchery, args.turboId);
    if (poolAddress === "0x0000000000000000000000000000000000000000") {
      console.log("turboId is not deployed");
      return;
    }

    const tx = await ammFactory.addLiquidity(
      contractAddresses.hatchery,
      args.turboId,
      args.amount,
      0,
      await signer.getAddress()
    );
    console.log(tx);
  });
