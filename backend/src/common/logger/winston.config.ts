import * as winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

/**
 * Winston log format configuration
 * Combines timestamp, error stack traces, and JSON formatting
 */
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

/**
 * Winston logger configuration
 * - Console transport for development (colorized, simple format)
 * - Daily rotating file for all logs (20MB max, 14 days retention)
 * - Daily rotating file for errors only (20MB max, 30 days retention)
 */
export const winstonConfig: winston.LoggerOptions = {
  transports: [
    // Console transport (development)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
      level: process.env.NODE_ENV === "production" ? "info" : "debug",
    }),

    // File transport - All logs with daily rotation
    new DailyRotateFile({
      filename: "logs/application-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "14d",
      format: logFormat,
    }),

    // File transport - Errors only with extended retention
    new DailyRotateFile({
      filename: "logs/error-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      level: "error",
      maxSize: "20m",
      maxFiles: "30d",
      format: logFormat,
    }),
  ],
};
