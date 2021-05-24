import React from "react";
import { render } from "react-dom";
import App from "./modules/App";
import * as comps from "@augurproject/comps";
const { windowRef } = comps;
console.log(comps);
// @ts-ignore
windowRef.appStatus = {};
windowRef.data = {};
windowRef.user = {};
windowRef.sport = {};
windowRef.betslip = {};

render(<App />, document.getElementById("root"));
