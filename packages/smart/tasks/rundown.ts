import { task } from "hardhat/config";
import axios from "axios";

task("rundown", "Retrieve rundown event information")
  .addParam("event", "The API key for fetching from TheRunDown")
  .addParam("key", "The API key for fetching from TheRunDown")
  .setAction(async (args) => {
    const result = await axios({
      method: "GET",
      url: `https://therundown-therundown-v1.p.rapidapi.com/events/${args.event}`,
      params: { include: "scores" },
      headers: {
        "x-rapidapi-key": args.key,
        "x-rapidapi-host": "therundown-therundown-v1.p.rapidapi.com",
      },
    });

    console.log(JSON.stringify(result.data, null, "  "));
  });
