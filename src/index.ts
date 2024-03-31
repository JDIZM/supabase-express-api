#!/usr/bin/env node

import { exampleFunction } from "@/exampleFunction.js";
import { version } from "../package.json";
import { test } from "@/helpers/index.js";
import { logger } from "@/helpers/logger.js";

// importing package json makes tsc bundle the /src folder
logger.info("version", version);

logger.debug("test", test);
exampleFunction("foo", "bar");

export * from "@/exampleFunction.js";
