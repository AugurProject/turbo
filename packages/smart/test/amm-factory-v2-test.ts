import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";
import * as factoryABI from '@balancer-labs/v2-deployments/deployed/mainnet/WeightedPoolFactory.json';

import {
  AbstractMarketFactoryV2,
	AMMFactory,
	AMMFactoryV2,
	AMMFactoryV2__factory,
  TrustedMarketFactory,
  TrustedMarketFactory__factory,
} from "../typechain";
import { BigNumber, Contract, ContractFactory } from "ethers";
import { calcShareFactor } from "../src";
import { buyWithValues, calculateSellCompleteSets, calculateSellCompleteSetsWithValues } from "../src/bmath";

describe("AMMFactoryV2", () => {
  let WeightedPoolFactory__factory: ContractFactory;
  let WeightedPool__factory: ContractFactory;
  let Cash__factory: ContractFactory;
  let FeePot__factory: ContractFactory;
  let Vault__factory: ContractFactory;

  let signer: SignerWithAddress;
  let secondSigner: SignerWithAddress;
  const outcomeSymbols = ["NO CONTEST", "HH", "UT"];
  const outcomeNames = ["No Contest", "Hulk Hogan", "Undertaker"];

  const usdcBasis = BigNumber.from(10).pow(6);
  const stakerFee = 0;
  const swapFee = BigNumber.from(10).pow(15).mul(15); // 1.5%
  const settlementFee = BigNumber.from(10).pow(15).mul(5); // 0.5%
  const protocolFee = 0;

  const MAX_APPROVAL = BigNumber.from(2).pow(256).sub(1);
  const ZERO = BigNumber.from(0);
  const BONE = BigNumber.from(10).pow(18);

  let collateral: Contract;
  let shareFactor: BigNumber;
  let marketFactory: TrustedMarketFactory;
  const marketId = BigNumber.from(1);
  let weightedPoolFactory: Contract;
  let ammFactory: AMMFactoryV2;

  // These are specific to the one market we are dealing with in the tests below.
  let shareTokens: Contract[];
  let balancerPool: Contract;

  before(async () => {
    [signer, secondSigner] = await ethers.getSigners();
    WeightedPoolFactory__factory = new ethers.ContractFactory(factoryABI.abi, factoryABI.bytecode, signer);
    WeightedPool__factory = await ethers.getContractFactory("WeightedPool");
    Cash__factory = await ethers.getContractFactory("Cash");
    Vault__factory = await ethers.getContractFactory("Vault");
    FeePot__factory = await ethers.getContractFactory("FeePot");
  });

  beforeEach(async () => {
    [signer, secondSigner] = await ethers.getSigners();
    collateral = await Cash__factory.deploy("USDC", "USDC", 6); // 6 decimals to mimic USDC
    const reputationToken = await Cash__factory.deploy("REPv2", "REPv2", 18);
    const feePot = await FeePot__factory.deploy(collateral.address, reputationToken.address);
    shareFactor = calcShareFactor(await collateral.decimals());
    marketFactory = await new TrustedMarketFactory__factory(signer).deploy(
      signer.address,
      collateral.address,
      shareFactor,
      feePot.address,
      stakerFee,
      settlementFee,
      signer.address,
      protocolFee
    );
		
    const Authorizer = await ethers.getContractFactory('Authorizer');
    const authorizer = await Authorizer.deploy(signer.address); // signer is admin
    const vault = await Vault__factory.deploy(authorizer.address, ethers.constants.AddressZero, BigNumber.from("0"), BigNumber.from("0"));
    weightedPoolFactory = await WeightedPoolFactory__factory.deploy(vault.address);
    ammFactory = await new AMMFactoryV2__factory(signer).deploy(weightedPoolFactory.address, swapFee);

    const endTime = BigNumber.from(Date.now())
      .div(1000)
      .add(60 * 60 * 24); // one day
    const description = "Who will win Wrestlemania III?";
    const odds = calcWeights([2, 49, 49]);
    await marketFactory.createMarket(signer.address, endTime, description, outcomeNames, outcomeSymbols, odds);
    
    const initialLiquidity = usdcBasis.mul(1000); // 1000 of the collateral
    await collateral.faucet(initialLiquidity);
    await collateral.approve(ammFactory.address, initialLiquidity);

    await ammFactory.createPool(marketFactory.address, marketId, initialLiquidity, signer.address);

    const weightedPoolAddress = await ammFactory.getPool(marketFactory.address, marketId);
    balancerPool = WeightedPool__factory.attach(weightedPoolAddress).connect(signer);
    await balancerPool.approve(ammFactory.address, MAX_APPROVAL);

    const { shareTokens: shareTokenAddresses } = await marketFactory.getMarket(marketId.toString());
    shareTokens = shareTokenAddresses.map((address: string) => collateral.attach(address).connect(secondSigner));
  });

  it("Create liquidity pool for market", async() => {
    // check answer after create pool
  })

  it("sell shares for collateral", async () => {
    const _outcome = 0;

    const collateralIn = usdcBasis.mul(100); // 100 of the collateral

    const secondSignerAMMFactory = ammFactory.connect(secondSigner);

    const secondMarketFactory = marketFactory.connect(secondSigner);

    const secondCollateral = collateral.connect(secondSigner);
    await secondCollateral.faucet(collateralIn);
    await secondCollateral.approve(secondMarketFactory.address, MAX_APPROVAL);

    const _setsInForCollateral = await secondMarketFactory.calcShares(collateralIn);
    await secondMarketFactory.mintShares(marketId.toString(), _setsInForCollateral, secondSigner.address);

    const [tokenAmountOut, _shareTokensIn] = await calculateSellCompleteSetsWithValues(
      secondSignerAMMFactory as AMMFactoryV2,
      (marketFactory as unknown) as AbstractMarketFactoryV2,
      marketId.toString(),
      _outcome,
      _setsInForCollateral.toString()
    );

    await shareTokens[_outcome].approve(secondSignerAMMFactory.address, MAX_APPROVAL);
    const collateralBefore = await secondCollateral.balanceOf(secondSigner.address);
    const sharesBefore = await shareTokens[_outcome].balanceOf(secondSigner.address);
    
    expect(_setsInForCollateral.lte(sharesBefore)).to.be.true;

    await secondSignerAMMFactory.sellForCollateral(
      secondMarketFactory.address,
      marketId,
      _outcome,
      _shareTokensIn.map((m) => BigNumber.from(m)),
      BigNumber.from(tokenAmountOut)
    );

    const collateralAfter = await secondCollateral.balanceOf(secondSigner.address);
    expect(collateralAfter.gt(collateralBefore)).to.be.true;
  });
});

function calcWeights(ratios: number[]): BigNumber[] {
  const basis = BigNumber.from(10).pow(18);
  const max = basis.mul(50);

  const total = ratios.reduce((total, x) => total + x, 0);
  const factor = max.div(total); // TODO this doesn't work if total is too large
  return ratios.map((r) => factor.mul(r));
}
