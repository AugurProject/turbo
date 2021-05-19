const fs = require("fs");
const { graphChainNames, addresses } = require("../../addresses");

function generateJsonEnvironments() {
  const keys = Object.keys(addresses);
  fs.mkdirSync("environments", { recursive: true });
  for (let i = 0; i < keys.length; i++) {
    const file = JSON.stringify(addresses[keys[i]]);
    fs.writeFileSync(`environments/${graphChainNames[keys[i]]}.json`, file);
  }
}

module.exports.generateJsonEnvironments = generateJsonEnvironments;
