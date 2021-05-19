import fs from "fs";
import { graphChainNames, addresses } from "../../addresses";

function generateJsonEnvironments() {
  const keys = Object.keys(addresses);
  fs.mkdirSync("environments", { recursive: true });
  for (let i = 0; i < keys.length; i++) {
    // @ts-ignore
    const file = JSON.stringify(addresses[keys[i]]);
    // @ts-ignore
    fs.writeFileSync(`environments/${graphChainNames[keys[i]]}.json`, file);
  }
}

module.exports.generateJsonEnvironments = generateJsonEnvironments;
