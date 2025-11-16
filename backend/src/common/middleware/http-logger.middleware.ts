import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { LoggerService } from "../logger/logger.service";

/**
 * HTTP request/response logging middleware
 *
 * Features:
 * - Logs all incoming requests with method, path, user agent, IP
 * - Logs response status and duration
 * - Automatically masks sensitive data (password, token, secret, apiKey)
 * - Uses error level for 4xx/5xx responses
 *
 * @example
 * ```typescript
 * // In app.module.ts
 * export class AppModule implements NestModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer
 *       .apply(HttpLoggerMiddleware)
 *       .forRoutes('*');
 *   }
 * }
 * ```
 */
@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  private logger = new LoggerService("HTTP");

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, body, headers } = req;
    const startTime = Date.now();

    // Mask sensitive data in request body
    const sanitizedBody = this.maskSensitiveData(body);

    // Log incoming request
    this.logger.log("Incoming request", "HTTP", {
      method,
      path: originalUrl,
      userAgent: headers["user-agent"],
      ip: req.ip,
      body: sanitizedBody,
    });

    // Log response when finished
    res.on("finish", () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;

      const logData = {
        method,
        path: originalUrl,
        statusCode,
        duration,
      };

      // Use error level for 4xx and 5xx responses
      if (statusCode >= 400) {
        this.logger.error("Request completed", undefined, "HTTP", logData);
      } else {
        this.logger.log("Request completed", "HTTP", logData);
      }
    });

    next();
  }

  /**
   * Mask sensitive fields in request data
   * Prevents passwords, tokens, secrets, and API keys from being logged
   *
   * @param data - Request body or any object
   * @returns Sanitized data with sensitive fields masked
   */
  private maskSensitiveData(data: any): any {
    if (!data || typeof data !== "object") {
      return data;
    }

    const sensitiveKeys = ["password", "token", "secret", "apikey"];
    const masked = { ...data };

    for (const key of Object.keys(masked)) {
      // Case-insensitive matching for sensitive keys
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
        masked[key] = "***MASKED***";
      }
    }

    return masked;
  }
}
