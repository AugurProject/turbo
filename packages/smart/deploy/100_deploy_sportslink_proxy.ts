import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { makeSigner } from "../tasks";
import { SportsLinkProxy__factory, SportsLinkMarketFactory } from "../typechain";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, ethers } = hre;

  const signer = await makeSigner(hre);
  const deployer = await signer.getAddress();

  const marketFactory = (await ethers.getContract("SportsLinkMarketFactory")) as SportsLinkMarketFactory;
  const owner = deployer;

  const args: Parameters<SportsLinkProxy__factory["deploy"]> = [
    owner,
    marketFactory.address
  ];

  await deployments.deploy("SportsLinkProxy", {
    from: deployer,
    args,
    log: true,
  });
};

func.tags = ["SportsLinkProxy"];
func.dependencies = [];

export default func;
