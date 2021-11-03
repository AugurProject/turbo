import { Address, BigDecimal, BigInt, Bytes, crypto } from "@graphprotocol/graph-ts";

export let ZERO: BigInt = BigInt.fromI32(0);
export let SHARES_DECIMALS = BigInt.fromI32(10).pow(18).toBigDecimal();
export let USDC_DECIMALS = BigInt.fromI32(10).pow(6).toBigDecimal();
export let DUST_POSITION_AMOUNT_BIG_DECIMAL = BigDecimal.fromString("0.0001");
export let DUST_POSITION_AMOUNT_BIG_INT = BigInt.fromI32(1);
export let BUY = 1;
export let SELL = 2;
export let ADD_LIQUIDITY = 3;
export let REMOVE_LIQUIDITY = 4;

function upperCase(s: string): string {
  let letterMap = new Map<string, string>();
  letterMap.set("a", "A");
  letterMap.set("b", "B");
  letterMap.set("c", "C");
  letterMap.set("d", "D");
  letterMap.set("e", "E");
  letterMap.set("f", "F");

  let r = new Array<string>();
  for (let i = 0; i < s.length; i++) {
    if (letterMap.has(s[i])) {
      r[i] = letterMap.get(s[i]);
    } else {
      r[i] = s[i];
    }
  }

  return r.join("");
}

export function toChecksumAddress(originalAddress: Address): string {
  let ret = originalAddress.toHexString().split("").slice(2);
  let addressToHash = Bytes.fromUTF8(ret.join(""));
  let hashed = crypto.keccak256(addressToHash).toHexString().split("").slice(2);
  for (let i = 0; i < ret.length; i += 1) {
    if (Number.parseInt(hashed[i], 16) >= 8) {
      ret[i] = upperCase(ret[i]);
    }
  }
  return "0x" + ret.join("");
}

export function mapAddressArray(arr: Address[]): string[] {
  let result = new Array<string>();
  for (let i = 0; i < arr.length; i++) {
    result.push(toChecksumAddress(arr[i]));
  }

  return result;
}

export function bigIntToHexString(bigint: BigInt): string {
  let hexString = bigint.toHexString().split("").slice(2);
  if (hexString.length == 1) {
    hexString.unshift("0");
  }
  hexString.unshift("0x");

  if (bigint.lt(ZERO)) {
    hexString.unshift("-");
  }
  return hexString.join("");
}

export function mapByteArray(arr: Bytes[]): string[] {
  let result = new Array<string>();
  for (let i = 0; i < arr.length; i++) {
    result.push(arr[i].toHexString());
  }

  return result;
}

export function mapArray(arr: BigInt[]): string[] {
  let result = new Array<string>();
  for (let i = 0; i < arr.length; i++) {
    result.push(bigIntToHexString(arr[i]));
  }

  return result;
}

export function bigIntMillisToSeconds(millis: BigInt): BigInt {
  return millis.div(BigInt.fromI32(1000));
}

export function roundBigDecimal(numberToRound: BigDecimal): BigDecimal {
  let parsedNumber: number = parseFloat(numberToRound.toString());
  let roundedNumber: number = Math.round((parsedNumber + Number.EPSILON) * 100) / 100;
  return BigDecimal.fromString(roundedNumber.toString());
}

class DayMonthYear {
  day: BigInt;
  month: BigInt;
  year: BigInt;

  constructor(day: BigInt, month: BigInt, year: BigInt) {
    this.day = day;
    this.month = month;
    this.year = year;
  }
}

// Ported from http://howardhinnant.github.io/date_algorithms.html#civil_from_days
function dayMonthYearFromEventTimestamp(timestamp: BigInt): DayMonthYear {
  let unixEpoch: BigInt = timestamp;
  let SECONDS_IN_DAY = BigInt.fromI32(86400);
  let ONE = BigInt.fromI32(1);

  // you can have leap seconds apparently - but this is good enough for us ;)
  let daysSinceEpochStart = unixEpoch / SECONDS_IN_DAY;
  daysSinceEpochStart = daysSinceEpochStart + BigInt.fromI32(719468);

  let era: BigInt = (daysSinceEpochStart >= ZERO ? daysSinceEpochStart : daysSinceEpochStart - BigInt.fromI32(146096)) / BigInt.fromI32(146097);
  let dayOfEra: BigInt = (daysSinceEpochStart - era * BigInt.fromI32(146097)); // [0, 146096]
  let yearOfEra: BigInt = (dayOfEra - dayOfEra/BigInt.fromI32(1460) + dayOfEra/BigInt.fromI32(36524) - dayOfEra/BigInt.fromI32(146096)) / BigInt.fromI32(365); // [0, 399]

  let year: BigInt = yearOfEra + (era * BigInt.fromI32(400));
  let dayOfYear: BigInt = dayOfEra - (BigInt.fromI32(365)*yearOfEra + yearOfEra/BigInt.fromI32(4) - yearOfEra/BigInt.fromI32(100)); // [0, 365]
  let monthZeroIndexed = (BigInt.fromI32(5)*dayOfYear + BigInt.fromI32(2))/BigInt.fromI32(153); // [0, 11]
  let day = dayOfYear - (BigInt.fromI32(153)*monthZeroIndexed+BigInt.fromI32(2))/BigInt.fromI32(5) + BigInt.fromI32(1); // [1, 31]
  let month = monthZeroIndexed + (monthZeroIndexed < BigInt.fromI32(10) ? BigInt.fromI32(3) : BigInt.fromI32(-9)); // [1, 12]

  year = month <= BigInt.fromI32(2) ? year + ONE : year;

  return new DayMonthYear(day, month, year);
}

export function getYearMonthDate(timestamp: BigInt): string {
  let dateFromTimestamp = dayMonthYearFromEventTimestamp(timestamp);
  let ten = BigInt.fromI32(10);
  let month = dateFromTimestamp.month.lt(ten) ? "0" + dateFromTimestamp.month.toString() : dateFromTimestamp.month.toString();
  let day = dateFromTimestamp.day.lt(ten) ? "0" + dateFromTimestamp.day.toString() : dateFromTimestamp.day.toString();
  return dateFromTimestamp.year.toString() + "-" + month + "-" + day;
}
