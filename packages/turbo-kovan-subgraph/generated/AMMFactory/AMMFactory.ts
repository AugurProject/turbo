// THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.

import {
  ethereum,
  JSONValue,
  TypedMap,
  Entity,
  Bytes,
  Address,
  BigInt
} from "@graphprotocol/graph-ts";

export class PoolCreated extends ethereum.Event {
  get params(): PoolCreated__Params {
    return new PoolCreated__Params(this);
  }
}

export class PoolCreated__Params {
  _event: PoolCreated;

  constructor(event: PoolCreated) {
    this._event = event;
  }

  get pool(): Address {
    return this._event.parameters[0].value.toAddress();
  }

  get marketFactory(): Address {
    return this._event.parameters[1].value.toAddress();
  }

  get marketId(): BigInt {
    return this._event.parameters[2].value.toBigInt();
  }

  get creator(): Address {
    return this._event.parameters[3].value.toAddress();
  }
}

export class AMMFactory extends ethereum.SmartContract {
  static bind(address: Address): AMMFactory {
    return new AMMFactory("AMMFactory", address);
  }

  addLiquidity(
    _marketFactory: Address,
    _marketId: BigInt,
    _collateralIn: BigInt,
    _minLPTokensOut: BigInt,
    _lpTokenRecipient: Address
  ): BigInt {
    let result = super.call(
      "addLiquidity",
      "addLiquidity(address,uint256,uint256,uint256,address):(uint256)",
      [
        ethereum.Value.fromAddress(_marketFactory),
        ethereum.Value.fromUnsignedBigInt(_marketId),
        ethereum.Value.fromUnsignedBigInt(_collateralIn),
        ethereum.Value.fromUnsignedBigInt(_minLPTokensOut),
        ethereum.Value.fromAddress(_lpTokenRecipient)
      ]
    );

    return result[0].toBigInt();
  }

  try_addLiquidity(
    _marketFactory: Address,
    _marketId: BigInt,
    _collateralIn: BigInt,
    _minLPTokensOut: BigInt,
    _lpTokenRecipient: Address
  ): ethereum.CallResult<BigInt> {
    let result = super.tryCall(
      "addLiquidity",
      "addLiquidity(address,uint256,uint256,uint256,address):(uint256)",
      [
        ethereum.Value.fromAddress(_marketFactory),
        ethereum.Value.fromUnsignedBigInt(_marketId),
        ethereum.Value.fromUnsignedBigInt(_collateralIn),
        ethereum.Value.fromUnsignedBigInt(_minLPTokensOut),
        ethereum.Value.fromAddress(_lpTokenRecipient)
      ]
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  bFactory(): Address {
    let result = super.call("bFactory", "bFactory():(address)", []);

    return result[0].toAddress();
  }

  try_bFactory(): ethereum.CallResult<Address> {
    let result = super.tryCall("bFactory", "bFactory():(address)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toAddress());
  }

  buy(
    _marketFactory: Address,
    _marketId: BigInt,
    _outcome: BigInt,
    _collateralIn: BigInt,
    _minTokensOut: BigInt
  ): BigInt {
    let result = super.call(
      "buy",
      "buy(address,uint256,uint256,uint256,uint256):(uint256)",
      [
        ethereum.Value.fromAddress(_marketFactory),
        ethereum.Value.fromUnsignedBigInt(_marketId),
        ethereum.Value.fromUnsignedBigInt(_outcome),
        ethereum.Value.fromUnsignedBigInt(_collateralIn),
        ethereum.Value.fromUnsignedBigInt(_minTokensOut)
      ]
    );

    return result[0].toBigInt();
  }

  try_buy(
    _marketFactory: Address,
    _marketId: BigInt,
    _outcome: BigInt,
    _collateralIn: BigInt,
    _minTokensOut: BigInt
  ): ethereum.CallResult<BigInt> {
    let result = super.tryCall(
      "buy",
      "buy(address,uint256,uint256,uint256,uint256):(uint256)",
      [
        ethereum.Value.fromAddress(_marketFactory),
        ethereum.Value.fromUnsignedBigInt(_marketId),
        ethereum.Value.fromUnsignedBigInt(_outcome),
        ethereum.Value.fromUnsignedBigInt(_collateralIn),
        ethereum.Value.fromUnsignedBigInt(_minTokensOut)
      ]
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  createPool(
    _marketFactory: Address,
    _marketId: BigInt,
    _initialLiquidity: BigInt,
    _weights: Array<BigInt>,
    _lpTokenRecipient: Address
  ): Address {
    let result = super.call(
      "createPool",
      "createPool(address,uint256,uint256,uint256[],address):(address)",
      [
        ethereum.Value.fromAddress(_marketFactory),
        ethereum.Value.fromUnsignedBigInt(_marketId),
        ethereum.Value.fromUnsignedBigInt(_initialLiquidity),
        ethereum.Value.fromUnsignedBigIntArray(_weights),
        ethereum.Value.fromAddress(_lpTokenRecipient)
      ]
    );

    return result[0].toAddress();
  }

  try_createPool(
    _marketFactory: Address,
    _marketId: BigInt,
    _initialLiquidity: BigInt,
    _weights: Array<BigInt>,
    _lpTokenRecipient: Address
  ): ethereum.CallResult<Address> {
    let result = super.tryCall(
      "createPool",
      "createPool(address,uint256,uint256,uint256[],address):(address)",
      [
        ethereum.Value.fromAddress(_marketFactory),
        ethereum.Value.fromUnsignedBigInt(_marketId),
        ethereum.Value.fromUnsignedBigInt(_initialLiquidity),
        ethereum.Value.fromUnsignedBigIntArray(_weights),
        ethereum.Value.fromAddress(_lpTokenRecipient)
      ]
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toAddress());
  }

  getPoolBalances(_marketFactory: Address, _marketId: BigInt): Array<BigInt> {
    let result = super.call(
      "getPoolBalances",
      "getPoolBalances(address,uint256):(uint256[])",
      [
        ethereum.Value.fromAddress(_marketFactory),
        ethereum.Value.fromUnsignedBigInt(_marketId)
      ]
    );

    return result[0].toBigIntArray();
  }

  try_getPoolBalances(
    _marketFactory: Address,
    _marketId: BigInt
  ): ethereum.CallResult<Array<BigInt>> {
    let result = super.tryCall(
      "getPoolBalances",
      "getPoolBalances(address,uint256):(uint256[])",
      [
        ethereum.Value.fromAddress(_marketFactory),
        ethereum.Value.fromUnsignedBigInt(_marketId)
      ]
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigIntArray());
  }

  getPoolWeights(_marketFactory: Address, _marketId: BigInt): Array<BigInt> {
    let result = super.call(
      "getPoolWeights",
      "getPoolWeights(address,uint256):(uint256[])",
      [
        ethereum.Value.fromAddress(_marketFactory),
        ethereum.Value.fromUnsignedBigInt(_marketId)
      ]
    );

    return result[0].toBigIntArray();
  }

  try_getPoolWeights(
    _marketFactory: Address,
    _marketId: BigInt
  ): ethereum.CallResult<Array<BigInt>> {
    let result = super.tryCall(
      "getPoolWeights",
      "getPoolWeights(address,uint256):(uint256[])",
      [
        ethereum.Value.fromAddress(_marketFactory),
        ethereum.Value.fromUnsignedBigInt(_marketId)
      ]
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigIntArray());
  }

  getSwapFee(_marketFactory: Address, _marketId: BigInt): BigInt {
    let result = super.call(
      "getSwapFee",
      "getSwapFee(address,uint256):(uint256)",
      [
        ethereum.Value.fromAddress(_marketFactory),
        ethereum.Value.fromUnsignedBigInt(_marketId)
      ]
    );

    return result[0].toBigInt();
  }

  try_getSwapFee(
    _marketFactory: Address,
    _marketId: BigInt
  ): ethereum.CallResult<BigInt> {
    let result = super.tryCall(
      "getSwapFee",
      "getSwapFee(address,uint256):(uint256)",
      [
        ethereum.Value.fromAddress(_marketFactory),
        ethereum.Value.fromUnsignedBigInt(_marketId)
      ]
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  pools(param0: Address, param1: BigInt): Address {
    let result = super.call("pools", "pools(address,uint256):(address)", [
      ethereum.Value.fromAddress(param0),
      ethereum.Value.fromUnsignedBigInt(param1)
    ]);

    return result[0].toAddress();
  }

  try_pools(param0: Address, param1: BigInt): ethereum.CallResult<Address> {
    let result = super.tryCall("pools", "pools(address,uint256):(address)", [
      ethereum.Value.fromAddress(param0),
      ethereum.Value.fromUnsignedBigInt(param1)
    ]);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toAddress());
  }

  removeLiquidity(
    _marketFactory: Address,
    _marketId: BigInt,
    _lpTokensPerOutcome: Array<BigInt>,
    _minCollateralOut: BigInt
  ): BigInt {
    let result = super.call(
      "removeLiquidity",
      "removeLiquidity(address,uint256,uint256[],uint256):(uint256)",
      [
        ethereum.Value.fromAddress(_marketFactory),
        ethereum.Value.fromUnsignedBigInt(_marketId),
        ethereum.Value.fromUnsignedBigIntArray(_lpTokensPerOutcome),
        ethereum.Value.fromUnsignedBigInt(_minCollateralOut)
      ]
    );

    return result[0].toBigInt();
  }

  try_removeLiquidity(
    _marketFactory: Address,
    _marketId: BigInt,
    _lpTokensPerOutcome: Array<BigInt>,
    _minCollateralOut: BigInt
  ): ethereum.CallResult<BigInt> {
    let result = super.tryCall(
      "removeLiquidity",
      "removeLiquidity(address,uint256,uint256[],uint256):(uint256)",
      [
        ethereum.Value.fromAddress(_marketFactory),
        ethereum.Value.fromUnsignedBigInt(_marketId),
        ethereum.Value.fromUnsignedBigIntArray(_lpTokensPerOutcome),
        ethereum.Value.fromUnsignedBigInt(_minCollateralOut)
      ]
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  sellForCollateral(
    _marketFactory: Address,
    _marketId: BigInt,
    _outcome: BigInt,
    _shareTokensIn: BigInt,
    _minSetsOut: BigInt
  ): BigInt {
    let result = super.call(
      "sellForCollateral",
      "sellForCollateral(address,uint256,uint256,uint256,uint256):(uint256)",
      [
        ethereum.Value.fromAddress(_marketFactory),
        ethereum.Value.fromUnsignedBigInt(_marketId),
        ethereum.Value.fromUnsignedBigInt(_outcome),
        ethereum.Value.fromUnsignedBigInt(_shareTokensIn),
        ethereum.Value.fromUnsignedBigInt(_minSetsOut)
      ]
    );

    return result[0].toBigInt();
  }

  try_sellForCollateral(
    _marketFactory: Address,
    _marketId: BigInt,
    _outcome: BigInt,
    _shareTokensIn: BigInt,
    _minSetsOut: BigInt
  ): ethereum.CallResult<BigInt> {
    let result = super.tryCall(
      "sellForCollateral",
      "sellForCollateral(address,uint256,uint256,uint256,uint256):(uint256)",
      [
        ethereum.Value.fromAddress(_marketFactory),
        ethereum.Value.fromUnsignedBigInt(_marketId),
        ethereum.Value.fromUnsignedBigInt(_outcome),
        ethereum.Value.fromUnsignedBigInt(_shareTokensIn),
        ethereum.Value.fromUnsignedBigInt(_minSetsOut)
      ]
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  tokenRatios(_marketFactory: Address, _marketId: BigInt): Array<BigInt> {
    let result = super.call(
      "tokenRatios",
      "tokenRatios(address,uint256):(uint256[])",
      [
        ethereum.Value.fromAddress(_marketFactory),
        ethereum.Value.fromUnsignedBigInt(_marketId)
      ]
    );

    return result[0].toBigIntArray();
  }

  try_tokenRatios(
    _marketFactory: Address,
    _marketId: BigInt
  ): ethereum.CallResult<Array<BigInt>> {
    let result = super.tryCall(
      "tokenRatios",
      "tokenRatios(address,uint256):(uint256[])",
      [
        ethereum.Value.fromAddress(_marketFactory),
        ethereum.Value.fromUnsignedBigInt(_marketId)
      ]
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigIntArray());
  }
}

export class ConstructorCall extends ethereum.Call {
  get inputs(): ConstructorCall__Inputs {
    return new ConstructorCall__Inputs(this);
  }

  get outputs(): ConstructorCall__Outputs {
    return new ConstructorCall__Outputs(this);
  }
}

export class ConstructorCall__Inputs {
  _call: ConstructorCall;

  constructor(call: ConstructorCall) {
    this._call = call;
  }

  get _bFactory(): Address {
    return this._call.inputValues[0].value.toAddress();
  }

  get _fee(): BigInt {
    return this._call.inputValues[1].value.toBigInt();
  }
}

export class ConstructorCall__Outputs {
  _call: ConstructorCall;

  constructor(call: ConstructorCall) {
    this._call = call;
  }
}

export class AddLiquidityCall extends ethereum.Call {
  get inputs(): AddLiquidityCall__Inputs {
    return new AddLiquidityCall__Inputs(this);
  }

  get outputs(): AddLiquidityCall__Outputs {
    return new AddLiquidityCall__Outputs(this);
  }
}

export class AddLiquidityCall__Inputs {
  _call: AddLiquidityCall;

  constructor(call: AddLiquidityCall) {
    this._call = call;
  }

  get _marketFactory(): Address {
    return this._call.inputValues[0].value.toAddress();
  }

  get _marketId(): BigInt {
    return this._call.inputValues[1].value.toBigInt();
  }

  get _collateralIn(): BigInt {
    return this._call.inputValues[2].value.toBigInt();
  }

  get _minLPTokensOut(): BigInt {
    return this._call.inputValues[3].value.toBigInt();
  }

  get _lpTokenRecipient(): Address {
    return this._call.inputValues[4].value.toAddress();
  }
}

export class AddLiquidityCall__Outputs {
  _call: AddLiquidityCall;

  constructor(call: AddLiquidityCall) {
    this._call = call;
  }

  get value0(): BigInt {
    return this._call.outputValues[0].value.toBigInt();
  }
}

export class BuyCall extends ethereum.Call {
  get inputs(): BuyCall__Inputs {
    return new BuyCall__Inputs(this);
  }

  get outputs(): BuyCall__Outputs {
    return new BuyCall__Outputs(this);
  }
}

export class BuyCall__Inputs {
  _call: BuyCall;

  constructor(call: BuyCall) {
    this._call = call;
  }

  get _marketFactory(): Address {
    return this._call.inputValues[0].value.toAddress();
  }

  get _marketId(): BigInt {
    return this._call.inputValues[1].value.toBigInt();
  }

  get _outcome(): BigInt {
    return this._call.inputValues[2].value.toBigInt();
  }

  get _collateralIn(): BigInt {
    return this._call.inputValues[3].value.toBigInt();
  }

  get _minTokensOut(): BigInt {
    return this._call.inputValues[4].value.toBigInt();
  }
}

export class BuyCall__Outputs {
  _call: BuyCall;

  constructor(call: BuyCall) {
    this._call = call;
  }

  get value0(): BigInt {
    return this._call.outputValues[0].value.toBigInt();
  }
}

export class CreatePoolCall extends ethereum.Call {
  get inputs(): CreatePoolCall__Inputs {
    return new CreatePoolCall__Inputs(this);
  }

  get outputs(): CreatePoolCall__Outputs {
    return new CreatePoolCall__Outputs(this);
  }
}

export class CreatePoolCall__Inputs {
  _call: CreatePoolCall;

  constructor(call: CreatePoolCall) {
    this._call = call;
  }

  get _marketFactory(): Address {
    return this._call.inputValues[0].value.toAddress();
  }

  get _marketId(): BigInt {
    return this._call.inputValues[1].value.toBigInt();
  }

  get _initialLiquidity(): BigInt {
    return this._call.inputValues[2].value.toBigInt();
  }

  get _weights(): Array<BigInt> {
    return this._call.inputValues[3].value.toBigIntArray();
  }

  get _lpTokenRecipient(): Address {
    return this._call.inputValues[4].value.toAddress();
  }
}

export class CreatePoolCall__Outputs {
  _call: CreatePoolCall;

  constructor(call: CreatePoolCall) {
    this._call = call;
  }

  get value0(): Address {
    return this._call.outputValues[0].value.toAddress();
  }
}

export class RemoveLiquidityCall extends ethereum.Call {
  get inputs(): RemoveLiquidityCall__Inputs {
    return new RemoveLiquidityCall__Inputs(this);
  }

  get outputs(): RemoveLiquidityCall__Outputs {
    return new RemoveLiquidityCall__Outputs(this);
  }
}

export class RemoveLiquidityCall__Inputs {
  _call: RemoveLiquidityCall;

  constructor(call: RemoveLiquidityCall) {
    this._call = call;
  }

  get _marketFactory(): Address {
    return this._call.inputValues[0].value.toAddress();
  }

  get _marketId(): BigInt {
    return this._call.inputValues[1].value.toBigInt();
  }

  get _lpTokensPerOutcome(): Array<BigInt> {
    return this._call.inputValues[2].value.toBigIntArray();
  }

  get _minCollateralOut(): BigInt {
    return this._call.inputValues[3].value.toBigInt();
  }
}

export class RemoveLiquidityCall__Outputs {
  _call: RemoveLiquidityCall;

  constructor(call: RemoveLiquidityCall) {
    this._call = call;
  }

  get value0(): BigInt {
    return this._call.outputValues[0].value.toBigInt();
  }
}

export class SellForCollateralCall extends ethereum.Call {
  get inputs(): SellForCollateralCall__Inputs {
    return new SellForCollateralCall__Inputs(this);
  }

  get outputs(): SellForCollateralCall__Outputs {
    return new SellForCollateralCall__Outputs(this);
  }
}

export class SellForCollateralCall__Inputs {
  _call: SellForCollateralCall;

  constructor(call: SellForCollateralCall) {
    this._call = call;
  }

  get _marketFactory(): Address {
    return this._call.inputValues[0].value.toAddress();
  }

  get _marketId(): BigInt {
    return this._call.inputValues[1].value.toBigInt();
  }

  get _outcome(): BigInt {
    return this._call.inputValues[2].value.toBigInt();
  }

  get _shareTokensIn(): BigInt {
    return this._call.inputValues[3].value.toBigInt();
  }

  get _minSetsOut(): BigInt {
    return this._call.inputValues[4].value.toBigInt();
  }
}

export class SellForCollateralCall__Outputs {
  _call: SellForCollateralCall;

  constructor(call: SellForCollateralCall) {
    this._call = call;
  }

  get value0(): BigInt {
    return this._call.outputValues[0].value.toBigInt();
  }
}
