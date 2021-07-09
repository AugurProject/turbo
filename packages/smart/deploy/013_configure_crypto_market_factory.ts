import { HardhatRuntimeEnvironment, HttpNetworkUserConfig } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isHttpNetworkConfig, makeSigner, PriceFeedConfig } from "../tasks";
import { CryptoMarketFactory, CryptoMarketFactory__factory } from "../typechain";
import { FAKE_COINS, getUpcomingFriday4pmEst } from "../src";
import { DeploymentsExtension } from "hardhat-deploy/dist/types";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments } = hre;

  if (!isHttpNetworkConfig(hre.network.config)) {
    return; // skip tests and internal deploy
  }

  const signer = await makeSigner(hre);
  const deployer = await signer.getAddress();
  const owner = hre.network.config.deployConfig?.owner || deployer;

  const marketFactory = CryptoMarketFactory__factory.connect(
    (await deployments.get("CryptoMarketFactory")).address,
    signer
  );

  const nextResolutionTime = await marketFactory.nextResolutionTime();
  if (nextResolutionTime.eq(0)) {
    const firstResolutionTime = getUpcomingFriday4pmEst().valueOf();
    await marketFactory.setFirstResolutionTime(firstResolutionTime);
  }

  if (await shouldAddCoins(marketFactory)) {
    for (const { symbol, priceFeedAddress, imprecision } of await getCoinList(hre.network.config, deployments)) {
      console.log(`Adding coin "${symbol}" to crypto market factory`);
      await marketFactory.addCoin(symbol, priceFeedAddress, imprecision);
    }
  } else {
    console.log("Not configuring coins for crypto market factory because it already has coins");
  }

  // finished with setup so can now set owner
  if (owner !== deployer) {
    console.log(
      `Transferring ownership of crypto market factory ${marketFactory.address} from ${deployer} to ${owner}`
    );
    await marketFactory.transferOwnership(owner);
  }
};

async function shouldAddCoins(marketFactory: CryptoMarketFactory): Promise<boolean> {
  const coinCount = (await marketFactory.getCoins()).length;
  // 1 because index 0 is fake coin, so length of 1 means there are no added coins
  return coinCount == 1;
}

// If the price feeds are specified then use them. Else, use fake coins.
async function getCoinList(
  networkConfig: HttpNetworkUserConfig,
  deployments: DeploymentsExtension
): Promise<PriceFeedConfig[]> {
  const priceFeeds = networkConfig.deployConfig?.externalAddresses?.priceFeeds;
  if (priceFeeds) {
    return priceFeeds;
  } else {
    return await Promise.all(
      FAKE_COINS.map(async (coin) => ({
        symbol: coin.symbol,
        priceFeedAddress: (await deployments.get(coin.deploymentName)).address,
        imprecision: coin.imprecision,
      }))
    );
  }
}

func.tags = ["ConfigureCryptoMarketFactory"];
func.dependencies = ["CryptoMarketFactory"];

export default func;
