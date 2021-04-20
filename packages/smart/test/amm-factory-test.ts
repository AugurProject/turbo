import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";

import { AbstractMarketFactory, AMMFactory } from "../typechain";
import { BigNumber, Contract, ContractFactory } from "ethers";
import { calcShareFactor } from "../src";
import { calculateSellCompleteSetsWithValues } from "../src/bmath";

describe("AMMFactory", () => {
  let AMMFactory__factory: ContractFactory;
  let BFactory__factory: ContractFactory;
  let Cash__factory: ContractFactory;
  let FeePot__factory: ContractFactory;
  let TrustedMarketFactory__factory: ContractFactory;

  let signer: SignerWithAddress;
  let secondSigner: SignerWithAddress;
  const outcomeSymbols = ["NO CONTEST", "HH", "UT"];
  const outcomeNames = ["No Contest", "Hulk Hogan", "Undertaker"];

  const usdcBasis = BigNumber.from(10).pow(6);
  const stakerFee = 0;
  const swapFee = BigNumber.from(10).pow(15).mul(15); // 1.5%
  const creatorFee = BigNumber.from(10).pow(15).mul(5); // 0.5%

  const MAX_APPROVAL = BigNumber.from(2).pow(256).sub(1);

  let collateral: Contract;
  let shareFactor: BigNumber;
  let marketFactory: Contract;
  const marketId = BigNumber.from(0);
  let bFactory: Contract;
  let ammFactory: Contract;

  before(async () => {
    AMMFactory__factory = await ethers.getContractFactory("AMMFactory");
    BFactory__factory = await ethers.getContractFactory("BFactory");
    Cash__factory = await ethers.getContractFactory("Cash");
    FeePot__factory = await ethers.getContractFactory("FeePot");
    TrustedMarketFactory__factory = await ethers.getContractFactory("TrustedMarketFactory");
  });

  beforeEach(async () => {
    [signer, secondSigner] = await ethers.getSigners();

    collateral = await Cash__factory.deploy("USDC", "USDC", 6); // 6 decimals to mimic USDC
    const reputationToken = await Cash__factory.deploy("REPv2", "REPv2", 18);
    const feePot = await FeePot__factory.deploy(collateral.address, reputationToken.address);
    shareFactor = calcShareFactor(await collateral.decimals());
    marketFactory = await TrustedMarketFactory__factory.deploy(
      signer.address,
      collateral.address,
      shareFactor,
      feePot.address,
      stakerFee,
      creatorFee
    );

    bFactory = await BFactory__factory.deploy();
    ammFactory = await AMMFactory__factory.deploy(bFactory.address, swapFee);

    const endTime = BigNumber.from(Date.now())
      .div(1000)
      .add(60 * 60 * 24); // one day
    const description = "Who will win Wrestlemania III?";
    await marketFactory.createMarket(signer.address, endTime, description, outcomeNames, outcomeSymbols);

    const basis = BigNumber.from(10).pow(18);
    const weights = [basis.mul(2).div(2), basis.mul(24).div(2), basis.mul(25).div(2)];

    const initialLiquidity = usdcBasis.mul(1000); // 1000 of the collateral
    await collateral.faucet(initialLiquidity);
    await collateral.approve(ammFactory.address, initialLiquidity);
    await ammFactory.createPool(marketFactory.address, marketId, initialLiquidity, weights, signer.address);
  });

  it("liquidity removal for collateral", async () => {
    const _outcome = 1;
    const { shareTokens: shareTokenAddresses } = await marketFactory.getMarket(marketId.toString());

    const liquidity = usdcBasis.mul(100); // 1000 of the collateral

    const secondSignerAMMFactory = ammFactory.connect(secondSigner);
    const secondMarketFactory = marketFactory.connect(secondSigner);

    const secondCollateral = collateral.connect(secondSigner);
    await secondCollateral.faucet(liquidity);
    await secondCollateral.approve(secondMarketFactory.address, MAX_APPROVAL);

    const _sets = await secondMarketFactory.calcShares(liquidity);
    await secondMarketFactory.mintShares(marketId.toString(), _sets, secondSigner.address);

    const setsToBurn = await calculateSellCompleteSetsWithValues(
      secondSignerAMMFactory as AMMFactory,
      marketFactory as AbstractMarketFactory,
      marketId.toString(),
      _outcome,
      _sets
    );

    const shareTokens = shareTokenAddresses.map((address: string) => collateral.attach(address).connect(secondSigner));

    await shareTokens[_outcome].approve(secondSignerAMMFactory.address, MAX_APPROVAL);
    const collateralBefore = await secondCollateral.balanceOf(secondSigner.address);
    const sharesBefore = await shareTokens[_outcome].balanceOf(secondSigner.address);

    expect(_sets.lte(sharesBefore)).to.be.true;

    await secondSignerAMMFactory.sellForCollateral(secondMarketFactory.address, marketId, _outcome, _sets, setsToBurn);

    const collateralAfter = await secondCollateral.balanceOf(secondSigner.address);

    expect(collateralAfter.gt(collateralBefore)).to.be.true;
  });

  it("should not fail when getting weights/ratios/balances on non-existent pools", async () => {
    const nonExistentMarketId = 10;
    const tokenRatios = await ammFactory.tokenRatios(marketFactory.address, nonExistentMarketId);
    expect(tokenRatios).to.be.empty;

    const poolBalances = await ammFactory.getPoolBalances(marketFactory.address, nonExistentMarketId);
    expect(poolBalances).to.be.empty;

    const poolWeights = await ammFactory.getPoolWeights(marketFactory.address, nonExistentMarketId);
    expect(poolWeights).to.be.empty;
  });
});
