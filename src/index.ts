#!/usr/bin/env node

import { exampleFunction } from "@/exampleFunction.js";
import { version } from "../package.json";
import { test } from "@/helpers/index.js";

// importing package json makes tsc bundle the /src folder
console.log("version", version);

console.log("test", test);
exampleFunction("foo", "bar");

export * from "@/exampleFunction.js";
