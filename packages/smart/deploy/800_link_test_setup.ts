import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isHttpNetworkConfig, makeSigner } from "../tasks";
import { SportsLinkMarketFactory, SportsLinkMarketFactory__factory, SportsLinkProxy__factory } from "../typechain";

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
    const currentLinkNode = await marketFactory.linkNode();
    if (linkNode === currentLinkNode) {
      console.log(`No need to set link node on market factory because it's already "${currentLinkNode}"`);
    } else {
      console.log(`Setting market factory "${marketFactory.address}" link node to "${linkNode}"`);
      await marketFactory.setLinkNode(linkNode);
      await marketFactory.setProtocol(linkNode, false); // unnecessary atm but matches intended prod
    }
  }

  const sportsLinkProxy = SportsLinkProxy__factory.connect((await deployments.get("SportsLinkProxy")).address, signer);

  const currentMarketFactory = await sportsLinkProxy.marketFactory();
  if (marketFactory.address === currentMarketFactory) {
    console.log(`No need to redirect link proxy because it already points to "${currentMarketFactory}"`);
  } else {
    console.log(`Redirecting link proxy to new market factory "${marketFactory.address}"`);
    await sportsLinkProxy.setMarketFactory(marketFactory.address);
  }
};

func.tags = ["LinkSetup"];
func.dependencies = ["SportsLinkMarketFactory"];

export default func;
