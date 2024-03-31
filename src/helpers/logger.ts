import chalk from "chalk";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LoggerClass {
  debug(logMessage: string, ...data: unknown[]): void;
  info(logMessage: string, ...data: unknown[]): void;
  warn(logMessage: string, ...data: unknown[]): void;
  error(logMessage: string, ...data: unknown[]): void;
}

class Logger implements LoggerClass {
  public debug(logMessage: string, ...data: unknown[]): void {
    this.emitLogMessage("debug", chalk.blue("DEBUG: " + logMessage), data);
  }

  public info(logMessage: string, ...data: unknown[]): void {
    this.emitLogMessage("info", chalk.white("INFO: " + logMessage), data);
  }

  public warn(logMessage: string, ...data: unknown[]): void {
    this.emitLogMessage("warn", chalk.cyan("WARN: " + logMessage), data);
  }

  public error(logMessage: string, ...data: unknown[]): void {
    this.emitLogMessage("error", chalk.red("ERROR: " + logMessage), data);
  }

  private emitLogMessage(level: LogLevel, msg: string, data: unknown[]): void {
    data?.length > 0 ? console[level](msg, data) : console[level](msg);
  }
}

// Singleton instance of the Logger class
export const logger = new Logger();
