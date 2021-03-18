// Instructions For Adding A New Environment
// 1. Import the environment file.
// 2. Add its name to the Environment type.
// 3. Add it to the exported environments object.

import local from "./local";
import kovan from "./kovan";

export type Environment = "local" | "kovan";
export const environments = {
  local,
  kovan,
};
