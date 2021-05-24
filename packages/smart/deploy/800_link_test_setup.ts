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

  const linkNode = hre.network.config.deployConfig?.linkNode;

  const marketFactory = SportsLinkMarketFactory__factory.connect(
    (await deployments.get("SportsLinkMarketFactory")).address,
    signer
  );

  const owner = await marketFactory.getOwner();
  const deployerAddress = await signer.getAddress();

  if (linkNode) {
    const currentLinkNode = await marketFactory.linkNode();
    if (linkNode === currentLinkNode) {
      console.log(`No need to set link node on market factory because it's already "${currentLinkNode}"`);
    } else if (owner !== deployerAddress) {
      console.warn(
        `Should set link node but can't because owner is "${owner}" but the deployer is "${deployerAddress}"`
      );
    } else {
      console.log(`Setting market factory "${marketFactory.address}" link node to "${linkNode}"`);
      await marketFactory.setLinkNode(linkNode);
      await marketFactory.setProtocol(linkNode, false); // unnecessary atm but matches intended prod
    }
  }
};

func.tags = ["LinkSetup"];
func.dependencies = ["SportsLinkMarketFactory"];

export default func;
