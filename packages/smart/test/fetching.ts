import {
  AbstractMarketFactoryV3,
  AMMFactory,
  BPool__factory,
  Cash__factory,
  CryptoMarketFactory,
  Sport,
} from "../typechain";
import { BigNumber, BigNumberish } from "ethers";
import { NULL_ADDRESS } from "../src";

const INITIAL_TOTAL_SUPPLY_OF_BPOOL = BigNumber.from(10).pow(20);
const ZERO = BigNumber.from(0);

export async function marketFactoryBundleCheck(marketFactory: AbstractMarketFactoryV3) {
  const collateral = Cash__factory.connect(await marketFactory.collateral(), marketFactory.signer);
  return {
    shareFactor: await marketFactory.shareFactor(),
    feePot: await marketFactory.feePot(),
    protocolFee: await marketFactory.protocolFee(),
    settlementFee: await marketFactory.settlementFee(),
    stakerFee: await marketFactory.stakerFee(),
    collateral: {
      addr: collateral.address,
      symbol: await collateral.symbol(),
      decimals: await collateral.decimals(),
    },
    marketCount: await marketFactory.marketCount(),
  };
}

export async function makePoolCheck(
  ammFactory: AMMFactory,
  marketFactory: AbstractMarketFactoryV3,
  marketId: BigNumberish
) {
  const addr = await ammFactory.getPool(marketFactory.address, marketId);
  if (addr === NULL_ADDRESS) {
    return {
      addr,
      tokenRatios: [],
      balances: [],
      weights: [],
      swapFee: ZERO,
      totalSupply: ZERO,
    };
  } else {
    const pool = BPool__factory.connect(addr, ammFactory.signer);
    return {
      addr,
      tokenRatios: await ammFactory.tokenRatios(marketFactory.address, marketId),
      balances: await ammFactory.getPoolBalances(marketFactory.address, marketId),
      weights: await ammFactory.getPoolWeights(marketFactory.address, marketId),
      swapFee: await ammFactory.getSwapFee(marketFactory.address, marketId),
      totalSupply: await pool.totalSupply(),
    };
  }
}
