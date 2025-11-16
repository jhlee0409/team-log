/**
 * Standard error response format for all API errors
 */
export interface ErrorResponse {
  /**
   * Error code in UPPER_SNAKE_CASE format
   * Used for programmatic error handling
   * @example "WORKSPACE_NOT_FOUND", "VALIDATION_ERROR"
   */
  code: string;

  /**
   * Human-readable error message
   * @example "Workspace with id 'abc123' does not exist"
   */
  message: string;

  /**
   * ISO 8601 timestamp when the error occurred
   * @example "2025-11-16T10:30:00.000Z"
   */
  timestamp: string;

  /**
   * Request path where the error occurred
   * @example "/workspaces/abc123"
   */
  path: string;

  /**
   * Unique trace ID for error tracking
   * @optional
   */
  traceId?: string;

  /**
   * Additional error details (validation errors, context, etc.)
   * @optional
   */
  details?: any;
}

/**
 * Validation error detail for field-level errors
 */
export interface ValidationErrorDetail {
  /**
   * Field name that failed validation
   * @example "name", "email"
   */
  field: string;

  /**
   * Constraint that was violated
   * @example "isNotEmpty", "isEmail"
   */
  constraint: string;

  /**
   * Human-readable validation error message
   * @example "Workspace name is required"
   */
  message: string;
}

/**
 * Permission error detail
 */
export interface PermissionErrorDetail {
  /**
   * Required role to perform the action
   */
  requiredRole: string;

  /**
   * Current user's role
   */
  userRole: string;
}
