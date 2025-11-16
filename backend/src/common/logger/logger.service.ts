import { Injectable, LoggerService as NestLoggerService } from "@nestjs/common";
import * as winston from "winston";
import { winstonConfig } from "./winston.config";

/**
 * Custom logger service implementing NestJS LoggerService interface
 * Uses Winston for structured logging with file rotation
 *
 * Features:
 * - Structured JSON logging
 * - Daily log file rotation
 * - Context-aware logging
 * - Metadata support
 * - Multiple log levels (error, warn, log/info, debug, verbose)
 *
 * @example
 * ```typescript
 * export class UserService {
 *   private logger = new LoggerService(UserService.name);
 *
 *   async createUser(data: CreateUserDto) {
 *     this.logger.log('Creating new user', UserService.name, { email: data.email });
 *
 *     try {
 *       const user = await this.prisma.user.create({ data });
 *       this.logger.log('User created successfully', UserService.name, { userId: user.id });
 *       return user;
 *     } catch (error) {
 *       this.logger.error('Failed to create user', error.stack, UserService.name, {
 *         email: data.email,
 *         errorMessage: error.message,
 *       });
 *       throw error;
 *     }
 *   }
 * }
 * ```
 */
@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;

  /**
   * @param context - Default context for all log messages (usually class name)
   */
  constructor(private context?: string) {
    this.logger = winston.createLogger(winstonConfig);
  }

  /**
   * Log informational message
   * @param message - Log message
   * @param context - Optional context override
   * @param meta - Additional metadata to include in log
   */
  log(message: string, context?: string, meta?: any) {
    this.logger.info(message, { context: context || this.context, ...meta });
  }

  /**
   * Log error message with stack trace
   * @param message - Error message
   * @param trace - Stack trace
   * @param context - Optional context override
   * @param meta - Additional metadata to include in log
   */
  error(message: string, trace?: string, context?: string, meta?: any) {
    this.logger.error(message, {
      context: context || this.context,
      trace,
      ...meta,
    });
  }

  /**
   * Log warning message
   * @param message - Warning message
   * @param context - Optional context override
   * @param meta - Additional metadata to include in log
   */
  warn(message: string, context?: string, meta?: any) {
    this.logger.warn(message, { context: context || this.context, ...meta });
  }

  /**
   * Log debug message (only in development)
   * @param message - Debug message
   * @param context - Optional context override
   * @param meta - Additional metadata to include in log
   */
  debug(message: string, context?: string, meta?: any) {
    this.logger.debug(message, { context: context || this.context, ...meta });
  }

  /**
   * Log verbose message (detailed information)
   * @param message - Verbose message
   * @param context - Optional context override
   * @param meta - Additional metadata to include in log
   */
  verbose(message: string, context?: string, meta?: any) {
    this.logger.verbose(message, {
      context: context || this.context,
      ...meta,
    });
  }
}
