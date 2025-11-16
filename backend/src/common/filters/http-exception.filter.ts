import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import {
  ErrorResponse,
  ValidationErrorDetail,
} from "../interfaces/error-response.interface";
import { BusinessException } from "../exceptions/business.exception";
import { v4 as uuidv4 } from "uuid";

/**
 * Global exception filter that standardizes error responses
 * Catches all HttpException instances and formats them according to ErrorResponse interface
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const traceId = uuidv4();

    // Build standard error response
    const errorResponse: ErrorResponse = {
      code: this.extractErrorCode(exception, exceptionResponse),
      message: this.extractMessage(exceptionResponse),
      timestamp: new Date().toISOString(),
      path: request.url,
      traceId,
    };

    // Add details if available
    const details = this.extractDetails(exceptionResponse);
    if (details) {
      errorResponse.details = details;
    }

    // Log error for monitoring
    this.logError(exception, request, traceId, status);

    // Send response
    response.status(status).json(errorResponse);
  }

  /**
   * Extract error code from exception
   * Priority: BusinessException.code > response.code > HTTP status mapping
   */
  private extractErrorCode(
    exception: HttpException,
    exceptionResponse: any,
  ): string {
    // BusinessException has custom code
    if (exception instanceof BusinessException) {
      return exception.code;
    }

    // Check if response has code
    if (typeof exceptionResponse === "object" && exceptionResponse.code) {
      return exceptionResponse.code;
    }

    // Validation error
    if (this.isValidationError(exceptionResponse)) {
      return "VALIDATION_ERROR";
    }

    // Map HTTP status to error code
    return this.httpStatusToErrorCode(exception.getStatus());
  }

  /**
   * Extract human-readable message from exception
   */
  private extractMessage(exceptionResponse: any): string {
    // String response
    if (typeof exceptionResponse === "string") {
      return exceptionResponse;
    }

    // Object response with message
    if (exceptionResponse && exceptionResponse.message) {
      // Validation errors have array of messages
      if (Array.isArray(exceptionResponse.message)) {
        return "Request validation failed";
      }
      return exceptionResponse.message;
    }

    // Default message
    return "An error occurred";
  }

  /**
   * Extract additional error details
   * Handles validation errors and custom details from BusinessException
   */
  private extractDetails(exceptionResponse: any): any {
    if (typeof exceptionResponse !== "object") {
      return null;
    }

    // Validation errors
    if (this.isValidationError(exceptionResponse)) {
      return {
        errors: this.formatValidationErrors(exceptionResponse.message),
      };
    }

    // BusinessException details
    if (exceptionResponse.details) {
      return exceptionResponse.details;
    }

    return null;
  }

  /**
   * Check if exception is a class-validator validation error
   */
  private isValidationError(exceptionResponse: any): boolean {
    return (
      typeof exceptionResponse === "object" &&
      Array.isArray(exceptionResponse.message) &&
      exceptionResponse.message.length > 0 &&
      exceptionResponse.message[0].property !== undefined &&
      exceptionResponse.message[0].constraints !== undefined
    );
  }

  /**
   * Format class-validator errors to our standard format
   */
  private formatValidationErrors(
    validationErrors: any[],
  ): ValidationErrorDetail[] {
    return validationErrors.map((error) => {
      const constraints = Object.keys(error.constraints || {});
      const constraint = constraints[0] || "unknown";

      return {
        field: error.property,
        constraint,
        message: error.constraints[constraint],
      };
    });
  }

  /**
   * Map HTTP status code to error code
   */
  private httpStatusToErrorCode(status: number): string {
    const codeMap: Record<number, string> = {
      400: "BAD_REQUEST",
      401: "UNAUTHORIZED",
      403: "FORBIDDEN",
      404: "NOT_FOUND",
      409: "CONFLICT",
      422: "UNPROCESSABLE_ENTITY",
      429: "TOO_MANY_REQUESTS",
      500: "INTERNAL_SERVER_ERROR",
      502: "BAD_GATEWAY",
      503: "SERVICE_UNAVAILABLE",
    };

    return codeMap[status] || "UNKNOWN_ERROR";
  }

  /**
   * Log error for monitoring
   * Error-level for 5xx, warn-level for 4xx
   */
  private logError(
    exception: HttpException,
    request: Request,
    traceId: string,
    status: number,
  ) {
    const message = `[${traceId}] ${request.method} ${request.url} - ${status} ${exception.message}`;

    if (status >= 500) {
      this.logger.error(message, exception.stack);
    } else if (status >= 400) {
      this.logger.warn(message);
    } else {
      this.logger.log(message);
    }
  }
}
