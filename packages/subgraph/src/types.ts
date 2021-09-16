import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts/index";

export class GenericSharesMintedParams {
  hash: Bytes;
  timestamp: BigInt;
  marketFactory: Address;
  marketIndex: BigInt;
  amount: BigInt;
  receiver: Address;
}
