import { HardhatRuntimeEnvironment, HttpNetworkConfig } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { BigNumber, BigNumberish, Signer } from "ethers";
import { calcShareFactor } from "../src";
import { isHttpNetworkConfig, makeSigner } from "../tasks";
import { Cash__factory, NBAMarketFactory__factory } from "../typechain";
import { DeploymentsExtension } from "hardhat-deploy/dist/types";
import { MarketFactoryContractName } from "../addresses";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  if (!isHttpNetworkConfig(hre.network.config)) return;

  const { deployments } = hre;
  const config: HttpNetworkConfig = hre.network.config;
  const signer = await makeSigner(hre);
  const deployer = await signer.getAddress();
  const {collateral, shareFactor} = await getCollateral(signer, deployments, config);
  const feePot = await deployments.get("FeePot");
  const {owner, protocol, linkNode} = getSpecialAddresses(config, deployer);
  const fees = getFees()

  async function deployMarketFactory(marketFactoryName: MarketFactoryContractName) {
    // all sports constructors have the same parameters
    const args: Parameters<NBAMarketFactory__factory["deploy"]> = [
      owner,
      collateral.address,
      shareFactor,
      feePot.address,
      fees,
      protocol,
      linkNode,
    ];
    await deployments.deploy(marketFactoryName, {
      from: deployer,
      contract: marketFactoryName,
      args,
      log: true,
    });
  }

  await deployMarketFactory("NBAMarketFactory");
  await deployMarketFactory("MLBMarketFactory");
  await deployMarketFactory("MMAMarketFactory");
  await deployMarketFactory("NFLMarketFactory");

  // all sports can use the same fetcher
  await deployments.deploy("NBAFetcher", {
    from: deployer,
    args: [],
    log: true,
  });
};

async function getCollateral(signer: Signer, deployments: DeploymentsExtension, config: HttpNetworkConfig) {
  const collateralAddress =
    config.deployConfig?.externalAddresses?.usdcToken || (await deployments.get("Collateral")).address;
  const collateral = Cash__factory.connect(collateralAddress, signer);
  const shareFactor = calcShareFactor(await collateral.decimals());

  return {collateral, shareFactor}
}

function getFees(): [BigNumberish, BigNumberish, BigNumberish] {
  const stakerFee = 0;
  const settlementFee = BigNumber.from(10).pow(14).mul(5); // 0.05%
  const protocolFee = 0;
return [stakerFee, settlementFee, protocolFee]
}

function getSpecialAddresses(config: HttpNetworkConfig, defaultAddress: string) {
  const owner = config.deployConfig?.owner || defaultAddress;
  const protocol = config.deployConfig?.protocol || defaultAddress;
  const linkNode = config.deployConfig?.linkNode || defaultAddress;
  return {owner, protocol, linkNode};

}


func.tags = ["Sports"];
func.dependencies = ["Tokens", "FeePot", "BFactory"];

export default func;
