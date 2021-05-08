import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isHttpNetworkConfig, makeSigner } from "../tasks";
import { SportsLinkMarketFactory, SportsLinkMarketFactory__factory } from "../typechain";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments } = hre;
  const signer = await makeSigner(hre);

  if (!isHttpNetworkConfig(hre.network.config)) {
    return; // skip tests and internal deploy. tests can set link node themselves
  }

  const { linkNode } = hre.network.config;

  const marketFactory = SportsLinkMarketFactory__factory.connect(
    (await deployments.get("SportsLinkMarketFactory")).address,
    signer
  );

  if (linkNode) {
    console.log(`Setting market factory "${marketFactory.address}" link node to "${linkNode}"`);
    await marketFactory.setLinkNode(linkNode);
    await marketFactory.setProtocol(linkNode, false); // unnecessary atm but matches intended prod
  }
};

func.tags = ["LinkSetup"];
func.dependencies = ["SportsLinkMarketFactory"];

export default func;
