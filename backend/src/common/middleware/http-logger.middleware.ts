import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { LoggerService } from "../logger/logger.service";

/**
 * HTTP request/response logging middleware
 *
 * Features:
 * - Logs all incoming requests with method, path, user agent, IP
 * - Logs response status and duration
 * - Automatically masks sensitive data (password, token, secret, apiKey)
 * - Uses appropriate log levels: warn for 4xx, error for 5xx
 * - Adds unique request ID for distributed tracing (X-Request-ID header)
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

    // Generate unique request ID for tracing (or use existing from client)
    const requestId = (headers["x-request-id"] as string) || uuidv4();

    // Add request ID to response headers for client tracking
    res.setHeader("X-Request-ID", requestId);

    // Mask sensitive data in request body
    const sanitizedBody = this.maskSensitiveData(body);

    // Log incoming request with request ID
    this.logger.log("Incoming request", "HTTP", {
      requestId,
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
        requestId,
        method,
        path: originalUrl,
        statusCode,
        duration,
      };

      // Differentiate log levels based on response status
      if (statusCode >= 500) {
        // Server errors (5xx) - critical issues
        this.logger.error("Request completed", undefined, "HTTP", logData);
      } else if (statusCode >= 400) {
        // Client errors (4xx) - user mistakes, invalid input
        this.logger.warn("Request completed", "HTTP", logData);
      } else {
        // Success responses (2xx, 3xx)
        this.logger.log("Request completed", "HTTP", logData);
      }
    });

    next();
  }

  /**
   * Mask sensitive fields in request data
   * Prevents passwords, tokens, secrets, API keys, and credentials from being logged
   *
   * @param data - Request body or any object
   * @returns Sanitized data with sensitive fields masked
   */
  private maskSensitiveData(data: any): any {
    if (!data || typeof data !== "object") {
      return data;
    }

    // Comprehensive list of sensitive key patterns
    const sensitiveKeys = [
      "password",
      "passwd",
      "pwd",
      "token",
      "accesstoken",
      "refreshtoken",
      "idtoken",
      "secret",
      "privatekey",
      "publickey",
      "apikey",
      "api_key",
      "clientsecret",
      "client_secret",
      "auth",
      "authorization",
      "credential",
      "credentials",
      "sessionid",
      "session_id",
      "cookie",
      "csrf",
      "xsrf",
      "signature",
      "salt",
      "hash",
      "private",
      "ssn",
      "social_security",
      "credit_card",
      "creditcard",
      "card_number",
      "cvv",
      "pin",
      "otp",
    ];
    const masked = { ...data };

    for (const key of Object.keys(masked)) {
      // Case-insensitive matching for sensitive keys
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
        masked[key] = "***MASKED***";
      } else if (typeof masked[key] === "object" && masked[key] !== null) {
        // Recursively mask nested objects
        masked[key] = this.maskSensitiveData(masked[key]);
      }
    }

    return masked;
  }
}
