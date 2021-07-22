import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isHttpNetworkConfig, makeSigner } from "../tasks";
import { FakePriceFeed__factory } from "../typechain";
import { COIN_SYMBOLS, coinDeploymentName, CoinMap } from "../src";
import { BigNumber } from "ethers";

const FAKE_COIN_PRICES: CoinMap = {
  BTC: 41585,
  ETH: 4228,
  MATIC: 1.23,
  DOGE: 0.55,
  REP: 48.12,
  LINK: 29.8,
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  if (!isHttpNetworkConfig(hre.network.config)) throw Error("Cannot deploy to non-HTTP network");
  const { deployments } = hre;
  const signer = await makeSigner(hre);

  if (hre.network.config.deployConfig?.externalAddresses?.priceFeeds) {
    console.log("Not configuring fake price feeds because real ones were specified");
    return;
  }

  for (const symbol of COIN_SYMBOLS) {
    const address = (await deployments.get(coinDeploymentName(symbol))).address;
    const priceFeed = FakePriceFeed__factory.connect(address, signer);

    const data = await priceFeed.latestRoundData();
    if (!data._answer.eq(0)) {
      console.log(`Skipping setting price feed for ${symbol} because it's already set`);
      continue;
    }

    const price = BigNumber.from((1e8 * FAKE_COIN_PRICES[symbol]).toFixed());
    console.log(`Setting price feed for ${symbol} to ${price}`);
    await priceFeed.addRound(1, price, 2, 4, 1); // arbitrary values
  }
};

func.tags = ["SetPriceFeeds"];
func.dependencies = ["PriceFeeds"];

export default func;
