import { HttpException, HttpStatus } from "@nestjs/common";

/**
 * Base class for all business logic exceptions
 * Extends NestJS HttpException with custom error code
 */
export class BusinessException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: any,
  ) {
    super({ code, message, details }, statusCode);
  }
}

// ============================================
// Workspace Exceptions
// ============================================

/**
 * Thrown when workspace is not found
 */
export class WorkspaceNotFoundException extends BusinessException {
  constructor(workspaceId: string) {
    super(
      "WORKSPACE_NOT_FOUND",
      `Workspace with id '${workspaceId}' does not exist`,
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * Thrown when user tries to access workspace without permission
 */
export class WorkspaceAccessDeniedException extends BusinessException {
  constructor(workspaceId: string, requiredRole: string, userRole: string) {
    super(
      "WORKSPACE_ACCESS_DENIED",
      "You do not have permission to access this workspace",
      HttpStatus.FORBIDDEN,
      {
        workspaceId,
        requiredRole,
        userRole,
      },
    );
  }
}

/**
 * Thrown when member already exists in workspace
 */
export class MemberAlreadyExistsException extends BusinessException {
  constructor(username: string, workspaceId: string) {
    super(
      "MEMBER_ALREADY_EXISTS",
      `User '${username}' is already a member of this workspace`,
      HttpStatus.CONFLICT,
      { username, workspaceId },
    );
  }
}

/**
 * Thrown when trying to invite non-existent user
 */
export class UserNotFoundException extends BusinessException {
  constructor(identifier: string) {
    super(
      "USER_NOT_FOUND",
      `User '${identifier}' does not exist`,
      HttpStatus.NOT_FOUND,
    );
  }
}

// ============================================
// Authentication Exceptions
// ============================================

/**
 * Thrown when authentication fails
 */
export class AuthenticationFailedException extends BusinessException {
  constructor(reason?: string) {
    super(
      "AUTHENTICATION_FAILED",
      reason || "Authentication failed",
      HttpStatus.UNAUTHORIZED,
    );
  }
}

/**
 * Thrown when GitHub token is invalid
 */
export class InvalidGithubTokenException extends BusinessException {
  constructor() {
    super(
      "INVALID_GITHUB_TOKEN",
      "The provided GitHub token is invalid or expired",
      HttpStatus.UNAUTHORIZED,
    );
  }
}

// ============================================
// Permission Exceptions
// ============================================

/**
 * Thrown when user doesn't have required permission
 */
export class InsufficientPermissionException extends BusinessException {
  constructor(requiredRole: string, userRole: string, action?: string) {
    const message = action
      ? `You need '${requiredRole}' role to ${action}`
      : "You do not have permission to perform this action";

    super("INSUFFICIENT_PERMISSION", message, HttpStatus.FORBIDDEN, {
      requiredRole,
      userRole,
    });
  }
}

// ============================================
// Validation Exceptions
// ============================================

/**
 * Thrown when request validation fails
 * This is typically handled by class-validator, but can be thrown manually
 */
export class ValidationException extends BusinessException {
  constructor(errors: Array<{ field: string; message: string }>) {
    super(
      "VALIDATION_ERROR",
      "Request validation failed",
      HttpStatus.BAD_REQUEST,
      { errors },
    );
  }
}

// ============================================
// Log Exceptions
// ============================================

/**
 * Thrown when log entry is not found
 */
export class LogNotFoundException extends BusinessException {
  constructor(workspaceId: string, date: Date) {
    super(
      "LOG_NOT_FOUND",
      `Log for workspace '${workspaceId}' on ${date.toISOString()} does not exist`,
      HttpStatus.NOT_FOUND,
    );
  }
}

// ============================================
// System Exceptions
// ============================================

/**
 * Thrown when external service is unavailable
 */
export class ExternalServiceException extends BusinessException {
  constructor(serviceName: string, error?: string) {
    super(
      "EXTERNAL_SERVICE_ERROR",
      `External service '${serviceName}' is currently unavailable`,
      HttpStatus.SERVICE_UNAVAILABLE,
      { serviceName, error },
    );
  }
}

/**
 * Thrown when database operation fails
 */
export class DatabaseException extends BusinessException {
  constructor(operation: string, error?: string) {
    super(
      "DATABASE_ERROR",
      `Database operation '${operation}' failed`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      { operation, error },
    );
  }
}
