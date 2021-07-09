import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { BigNumber } from "ethers";
import { calcShareFactor } from "../src";
import { isHttpNetworkConfig, makeSigner } from "../tasks";
import { Cash__factory, CryptoMarketFactory__factory } from "../typechain";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments } = hre;

  if (!isHttpNetworkConfig(hre.network.config)) {
    return; // skip tests and internal deploy
  }

  const signer = await makeSigner(hre);
  const deployer = await signer.getAddress();

  const version = hre.network.config.deployConfig?.version;
  const collateralAddress =
    hre.network.config.deployConfig?.externalAddresses?.usdcToken || (await deployments.get("Collateral")).address;
  const collateral = Cash__factory.connect(collateralAddress, signer);
  const shareFactor = calcShareFactor(await collateral.decimals());

  const feePot = await deployments.get("FeePot");
  const stakerFee = 0;
  const settlementFee = BigNumber.from(10).pow(14).mul(5); // 0.05%
  const protocolFee = 0;

  const protocol = hre.network.config.deployConfig?.protocol || deployer;
  const linkNode = hre.network.config.deployConfig?.linkNode || deployer;

  const args: Parameters<CryptoMarketFactory__factory["deploy"]> = [
    version,
    deployer, // initial owner must be deployer for coins to be addable
    collateral.address,
    shareFactor,
    feePot.address,
    stakerFee,
    settlementFee,
    protocol,
    protocolFee,
    linkNode
  ];

  await deployments.deploy("CryptoMarketFactory", {
    from: deployer,
    args,
    log: true,
  });
};

func.tags = ["CryptoMarketFactory"];
func.dependencies = ["Tokens", "FeePot", "Version"];

export default func;
