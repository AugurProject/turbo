import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { isHttpNetworkConfig, makeSigner } from "../tasks";
import { CryptoMarketFactory__factory } from "../typechain";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments } = hre;

  if (!isHttpNetworkConfig(hre.network.config)) {
    return; // skip tests and internal deploy
  }

  const signer = await makeSigner(hre);
  const deployer = await signer.getAddress();
  const owner = hre.network.config.deployConfig?.owner || deployer;
  const btcPriceFeed =
    hre.network.config.deployConfig?.externalAddresses?.btcPriceFeed || (await deployments.get("BTCPriceFeed")).address;
  const ethPriceFeed =
    hre.network.config.deployConfig?.externalAddresses?.ethPriceFeed || (await deployments.get("ETHPriceFeed")).address;

  const marketFactory = CryptoMarketFactory__factory.connect((await deployments.get("CryptoMarketFactory")).address, signer);

  // create coins
  const coinCount = (await marketFactory.getCoins()).length;
  if (coinCount === 1) { // 1 because index 0 is fake coin
    const coins = [
      {
        name: "BTC",
        priceFeed: btcPriceFeed,
      },
      {
        name: "ETH",
        priceFeed: ethPriceFeed,
      },
    ];
    for (const { name, priceFeed } of coins) {
      console.log(`Adding coin "${name}" to crypto market factory`);
      await marketFactory.addCoin(name, priceFeed);
    }
  }

  // finished with setup so can now set owner
  if (owner !== deployer) {
    await marketFactory.transferOwnership(owner);
  }
};

func.tags = ["ConfigureCryptoMarketFactory"];
func.dependencies = ["CryptoMarketFactory"];

export default func;
