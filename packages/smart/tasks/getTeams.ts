import { task } from "hardhat/config";
import axios from "axios";
import fs from "fs";

interface TeamsObjectType {
  [id: string]: {
    team_id: number;
    name: string;
    mascot: string;
    abbrevation: string;
    record?: string;
    sport_id: string;
  };
}

task("getTeams", "Retrieve teams information")
  .addParam("sports", "The Sport ID array to get team data for, e.g.: 1,2,3")
  .addParam("key", "The API key for fetching from TheRunDown")
  .setAction(async (args, hre) => {
    const promiseArray = [];
    let num = 0;
    const sportsArray = args.sports.split(",");
    while (num < sportsArray.length) {
      const sportId = sportsArray[num];
      promiseArray.push(
        axios({
          method: "GET",
          url: `https://therundown-therundown-v1.p.rapidapi.com/sports/${sportId}/teams`,
          headers: {
            "x-rapidapi-key": args.key,
            "x-rapidapi-host": "therundown-therundown-v1.p.rapidapi.com",
          },
          data: sportId,
        })
      );
      num++;
    }
    const result = await Promise.all(promiseArray).then((values) => {
      let output = {};
      values.forEach((res) => {
        const sportId = res?.config?.data;
        const teams = res?.data?.teams?.entries();
        const teamsObject: TeamsObjectType = {};
        for (const t of teams) {
          teamsObject[t[1].team_id] = { ...t[1], sport_id: sportId };
        }
        output = { ...output, ...teamsObject };
      });
      return output;
    });
    const teamsJson = JSON.stringify(result, null, "  ");
    const path = "../comps/src/utils/teams.json";
    try {
      fs.unlinkSync(path);
    } catch (e) {
      console.log("There was an error deleting the old version of teams.json: ", e);
    }
    try {
      fs.writeFileSync(path, teamsJson);
    } catch (e) {
      console.log("There was an error writing to teams.json: ", e);
    }

    console.log("getTeams task complete.");
  });
