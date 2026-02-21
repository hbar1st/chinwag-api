import winston, { format } from "winston";
const { combine, errors, printf, colorize, timestamp } = format;
import "dotenv/config";
import { env } from "node:process";

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
};

const logFormat = printf(({ level, message, timestamp, stack, ...other }) => {
  let log = `${timestamp}\n [${level}]: ${message}`;

  if (Object.keys(other).length > 0) {
    log += `\n--\n${JSON.stringify(other, null, 2)}\n--`;
  }

  if (stack) {
    log += `\n${stack}`;
  }

  return log;
});

// This function creates transports based on silent mode
function createTransports(silent=false) {
  if (env.NODE_ENV === "production") {
    return [
      new winston.transports.Console({
        silent: false,
        format: combine(
          timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
          errors({ stack: true }),
          logFormat,
          colorize(),
        ),
      }),

      new winston.transports.File({
        filename: "logs/error.log",
        level: "warn",
        silent,
      }),

      new winston.transports.File({
        filename: "logs/combined.log",
        silent,
      }),
    ];
  } else {
      return [
        new winston.transports.Console({
          silent: false,
          stderrLevels: ["error", "info", "warn"],
          consoleWarnLevels: ["warn"],
          format: combine(
            timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
            errors({ stack: true }),
            logFormat,
            colorize(),
          ),
        }),
      ];
  } 
}

// Export a function that builds the logger
export function createLogger(silent=false) {
  
  return winston.createLogger({
    levels: logLevels,
    level: process.env.LOG_LEVEL ?? "info",
    format: combine(
      timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      colorize(),
      errors({ stack: true }),
      logFormat,
    ),
    transports: createTransports(silent),
  });
}

// Default logger for production/dev

export const logger = createLogger(false);

export default logger;