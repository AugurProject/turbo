import { AbstractMarketFactoryV3, AMMFactory, BPool__factory, Cash__factory } from "../typechain";
import { BigNumber, BigNumberish } from "ethers";
import { NULL_ADDRESS } from "../src";

const ZERO = BigNumber.from(0);

export async function marketFactoryBundleCheck(
  marketFactory: AbstractMarketFactoryV3
): Promise<{
  feePot: string;
  stakerFee: BigNumber;
  marketCount: BigNumber;
  protocolFee: BigNumber;
  settlementFee: BigNumber;
  shareFactor: BigNumber;
  collateral: { symbol: string; decimals: number; addr: string };
}> {
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
): Promise<
  | {
      balances: BigNumber[];
      tokenRatios: BigNumber[];
      totalSupply: BigNumber;
      swapFee: BigNumber;
      addr: string;
      weights: BigNumber[];
    }
  | { balances: any[]; tokenRatios: any[]; totalSupply: BigNumber; swapFee: BigNumber; addr: string; weights: any[] }
> {
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
