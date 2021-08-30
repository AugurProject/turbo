import { CLIArgumentType } from "hardhat/types";
import { BigNumber, ethers, BigNumberish } from "ethers";
import { IERC20Full } from "../../typechain";
import { MAX_UINT256 } from "./constants";
import { isBytes, isHexString } from "@ethersproject/bytes";

export const bignumber: CLIArgumentType<ethers.BigNumber> = {
  name: "bignumber",
  parse: (argName, strValue) => {
    if (!isBigNumberish(strValue)) {
      throw new Error(`Invalid vale ${strValue} for argument ${argName} of type ${bignumber.name}`);
    }
    return BigNumber.from(strValue);
  },
  /**
   * Check if argument value is of type "int"
   *
   * @param argName {string} argument's name - used for context in case of error.
   * @param value {any} argument's value to validate.
   *
   * @throws HH301 if value is not of type "int"
   */
  validate: (argName: string, value: any): void => {
    if (!isBigNumberish(value)) {
      throw new Error(`Invalid vale ${value} for argument ${argName} of type ${bignumber.name}`);
    }
  },
};

export async function getERC20Name(contract: IERC20Full): Promise<string | null> {
  let name: string | null = null;

  name = await contract.name().catch(() => null);
  if (name) return name;

  name = await contract.symbol().catch(() => null);

  return name; // may be a string or null
}

export async function calcWei(
  contract: IERC20Full,
  small: BigNumber,
  large: BigNumber,
  all: boolean
): Promise<{ wei: BigNumber; weiDesc: string }> {
  let wei = small;
  let weiDesc = small.toString();
  if (all) {
    wei = MAX_UINT256;
    weiDesc = "ALL";
  } else if (large.gt(0)) {
    const decimals = await contract.decimals();
    const factor = BigNumber.from(10).pow(decimals);
    console.log(wei);
    wei = wei.add(large.mul(factor));

    const name = (await getERC20Name(contract)) || "unknown";

    if (small.gt(0)) {
      weiDesc = `${large.toString()} ${name} + ${small.toString()} 'wei'`;
    } else {
      weiDesc = `${large.toString()} ${name}`;
    }
  }

  return { wei, weiDesc };
}

function isBigNumberish(value: any): value is BigNumberish {
  return (
    value != null &&
    (BigNumber.isBigNumber(value) ||
      (typeof value === "number" && value % 1 === 0) ||
      (typeof value === "string" && !!value.match(/^-?[0-9]+$/)) ||
      isHexString(value) ||
      typeof value === "bigint" ||
      isBytes(value))
  );
}
