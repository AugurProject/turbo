import { ethers } from "hardhat";
import { expect } from "chai";

import { Greeter__factory } from "../typechain";

describe("Symbiote", () => {
  it("is deployable", async () => {
    const signer = (await ethers.getSigners())[0];
    const greeterFactory = new Greeter__factory(signer)
    const greeter = await greeterFactory.deploy("Hello, world!")

    expect(await greeter.greet()).to.equal("Hello, world!");

    await greeter.setGreeting("Hola, mundo!");
    expect(await greeter.greet()).to.equal("Hola, mundo!");
  });
});
