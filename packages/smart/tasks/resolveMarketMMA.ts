import { task, types } from "hardhat/config";

import "hardhat/types/config";
import { buildContractInterfaces, ContractInterfaces, MMAMarketFactory__factory, MMAMarketFactory } from "..";
import { makeSigner } from "./deploy";

import axios from "axios";
import { BigNumberish } from "@ethersproject/bignumber";

interface Fighter {
  Active: boolean;
  FighterId: number;
  FirstName: string;
  LastName: string;
  Moneyline: number;
  Winner: boolean;
}
interface Fight {
  Active: boolean;
  DateTime?: string;
  FightId: number;
  Fighters: Fighter[];
  ResultClock: number;
  ResultRound: number;
  Status: string;
}

interface EventInfo {
  id: BigNumberish;
  markets: BigNumberish[];
  lines: BigNumberish[];
  homeTeamId: BigNumberish;
  awayTeamId: BigNumberish;
  homeTeamName: string;
  awayTeamName: string;
  estimatedStartTime: BigNumberish;
}

async function queryFight(apiKey: string, fightId: string): Promise<Fight> {
  const response = await axios({
    method: "GET",
    url: `https://fly.sportsdata.io/v3/mma/stats/json/Fight/${fightId}?key=${apiKey}`,
  });

  return response.data;
}

task("resolve", "Resolve should close market")
  // .addParam("marketfactory", "market factory name")
  .addParam("factoryaddress", "market factory address")
  .addParam("apikey", "api key")
  .setAction(async ({ factoryaddress, apikey }, hre) => {
    const signer = await makeSigner(hre);
    const marketFactory = MMAMarketFactory__factory.connect(factoryaddress, signer) as MMAMarketFactory;

    const shouldResolveList: BigNumberish[] = [];

    // fetch event id should be resolve
    const eventIds: BigNumberish[] = await marketFactory.listResolvableEvents();

    for (const eventId of eventIds) {
      const fightInfo = await queryFight(apikey, eventId.toString());

      // active and status is final
      if (fightInfo.Active == true && fightInfo.Status == "Final") {
        const eventInfo: EventInfo = await marketFactory.getSportsEvent(eventId);
        shouldResolveList.push(eventInfo.markets[0]);
      }
    }
    console.log("Should resolve markets: ");
    console.table(shouldResolveList.map((marketId) => ({ factoryName: "MMA", marketId: marketId.toString() })));
  });
