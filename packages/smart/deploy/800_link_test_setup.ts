import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isHttpNetworkConfig, makeSigner } from "../tasks";
import { SportsLinkMarketFactory, SportsLinkMarketFactory__factory } from "../typechain";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments } = hre;
  const signer = await makeSigner(hre);

  if (!isHttpNetworkConfig(hre.network.config)) {
    return; // skip tests and internal deploy... TODO handle them
  }

  const { linkOracle, linkTokenAddress, linkNode } = hre.network.config;

  if (!(linkOracle && linkTokenAddress)) return console.warn("Link addresses not specified in hardhat config so skipping link setup");

  console.log(`Setting link config: LINK=${linkTokenAddress} oracle=${linkOracle} node=${linkNode}`);

  const marketFactory = SportsLinkMarketFactory__factory.connect((await deployments.get("SportsLinkMarketFactory")).address, signer);
  await marketFactory.setLinkNode(linkNode);
  await marketFactory.setChainlinkTokenExternal(linkTokenAddress);
  await marketFactory.setLinkOracle(linkOracle);
  await marketFactory.setProtocol(linkNode, false); // unnecessary atm but matches intended prod
};

func.tags = ["LinkSetup"];
func.dependencies = ["SportsLinkMarketFactory"];

export default func;
