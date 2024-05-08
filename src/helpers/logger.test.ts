import chalk from "chalk";
import { logger } from "./logger.ts";
import { describe, it, expect, vi } from "vitest";
// FIXME why is this test failing locally?? only on npm run test?
describe("logger", () => {
  it("should log a debug message", () => {
    const spy = vi.spyOn(console, "debug");
    logger.debug("debug message");
    expect(spy).toBeCalledWith(chalk.blue("DEBUG: debug message"));
  });

  it("should log an info message", () => {
    const spy = vi.spyOn(console, "info");
    logger.info("info message");
    expect(spy).toBeCalledWith(chalk.white("INFO: info message"));
  });

  it("should log a warn message", () => {
    const spy = vi.spyOn(console, "warn");
    logger.warn("warn message");
    expect(spy).toBeCalledWith(chalk.cyan("WARN: warn message"));
  });

  it("should log an error message", () => {
    const spy = vi.spyOn(console, "error");
    logger.error("error message");
    expect(spy).toBeCalledWith(chalk.red("ERROR: error message"));
  });

  it("should log a debug message with data", () => {
    const spy = vi.spyOn(console, "debug");
    logger.debug("debug message", { data: "data" });
    expect(spy).toBeCalledWith(chalk.blue("DEBUG: debug message"), [{ data: "data" }]);
  });
});
