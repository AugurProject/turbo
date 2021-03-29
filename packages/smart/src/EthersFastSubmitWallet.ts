import { BigNumber, BigNumberish, ethers } from "ethers";
import { BytesLike } from "@ethersproject/bytes";
import { ExternallyOwnedAccount } from "@ethersproject/abstract-signer";
import { SigningKey } from "@ethersproject/signing-key";
import { BlockTag, TransactionRequest } from "@ethersproject/abstract-provider";

export class EthersFastSubmitWallet extends ethers.Wallet {
  private nonce = 0;
  private _gasPrice = 35e9;
  private _gasPriceOverride: GasPrice = "auto";
  private _gasLimit: GasLimit = "auto";

  static async create(
    privateKey: BytesLike | ExternallyOwnedAccount | SigningKey,
    provider: ethers.providers.Provider
  ): Promise<EthersFastSubmitWallet> {
    const wallet = new EthersFastSubmitWallet(privateKey, provider);
    const nonce = await provider.getTransactionCount(wallet.address, "pending");
    wallet.setNonce(nonce);
    wallet.startGasPriceCheck();
    return wallet;
  }

  setNonce(nonce: number): void {
    this.nonce = nonce;
  }

  startGasPriceCheck(): void {
    const repeater = (): void => {
      if (!this?.provider) return; // finish if object is garbage collected
      void this.provider.getGasPrice().then((gasPrice) => {
        this._gasPrice = Math.round(gasPrice.toNumber() * 1.1);
        setTimeout(repeater, 15000);
      });
    };

    repeater();
  }

  set gasPrice(newPrice: GasPrice) {
    if (newPrice === "auto" || typeof newPrice !== "number") {
      this._gasPriceOverride = "auto";
    } else {
      this._gasPriceOverride = newPrice;
    }
  }
  get gasPrice(): GasPrice {
    return this._gasPriceOverride === "auto" ? this._gasPrice : this._gasPriceOverride;
  }

  set gasLimit(newLimit: GasLimit) {
    if (newLimit === "auto" || typeof newLimit !== "number") {
      this._gasLimit = "auto";
    } else {
      this._gasLimit = newLimit;
    }
  }
  get gasLimit(): GasLimit {
    return this._gasLimit;
  }

  // If we ever have a use case for a different kind of message signing split this into `signMessage` (new) and `signBinaryMessage` (below)
  signMessage(message: BytesLike): Promise<string> {
    const hashmessage = ethers.utils.arrayify(message);
    return Promise.resolve(super.signMessage(hashmessage));
  }

  async estimateGas(transaction: ethers.providers.TransactionRequest): Promise<ethers.BigNumber> {
    transaction = ethers.utils.shallowCopy(transaction);
    delete transaction.from;

    if (this.gasLimit === "auto" || transaction.gasLimit !== undefined) {
      // Default to using provider's gas estimation, which typically calls eth_estimateGas on the node.
      // If the per-tx gas limit is set to "auto" then always use the provider.
      // If the per-tx gas limit is set to anything else then pass it along to the provider, which typically just returns it.

      return super.estimateGas(transaction);
    } else {
      return BigNumber.from(this._gasLimit);
    }
  }

  async sendTransaction(
    transaction: ethers.providers.TransactionRequest
  ): Promise<ethers.providers.TransactionResponse> {
    transaction = ethers.utils.shallowCopy(transaction);
    transaction.nonce = this.nonce;
    transaction.from = this.address;
    transaction.gasPrice = transaction.gasPrice || this.gasPrice;
    delete transaction.from; // https://github.com/ethers-io/ethers.js/issues/321
    this.nonce++;

    const populatedTx = await this.populateTransaction(transaction);
    const signedTransaction = await this.signTransaction(populatedTx);
    return this.provider.sendTransaction(signedTransaction);
  }

  async call(transaction: TransactionRequest, blockTag?: BlockTag): Promise<string> {
    return super.call(transaction, blockTag);
  }
}

export type GasLimit = "auto" | BigNumberish;
export type GasPrice = "auto" | BigNumberish;
