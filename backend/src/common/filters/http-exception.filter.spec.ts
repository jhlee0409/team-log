import { Test } from "@nestjs/testing";
import { HttpExceptionFilter } from "./http-exception.filter";
import {
  ArgumentsHost,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  HttpStatus,
} from "@nestjs/common";
import {
  BusinessException,
  WorkspaceNotFoundException,
  InsufficientPermissionException,
} from "../exceptions/business.exception";
import { Request, Response } from "express";

describe("HttpExceptionFilter", () => {
  let filter: HttpExceptionFilter;
  let mockArgumentsHost: ArgumentsHost;
  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    // Setup mock response
    mockJson = jest.fn().mockReturnThis();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    mockResponse = {
      status: mockStatus,
    };

    // Setup mock request
    mockRequest = {
      url: "/test-path",
      method: "GET",
    };

    // Setup mock ArgumentsHost
    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
      getArgByIndex: jest.fn(),
      getArgs: jest.fn(),
      getType: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    } as any;

    filter = new HttpExceptionFilter();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("NestJS built-in exceptions", () => {
    it("should handle NotFoundException with standard format", () => {
      const exception = new NotFoundException("Resource not found");

      filter.catch(exception, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "NOT_FOUND",
          message: "Resource not found",
          timestamp: expect.any(String),
          path: "/test-path",
          traceId: expect.any(String),
        }),
      );
    });

    it("should handle BadRequestException", () => {
      const exception = new BadRequestException("Invalid input");

      filter.catch(exception, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "BAD_REQUEST",
          message: "Invalid input",
        }),
      );
    });

    it("should handle ForbiddenException", () => {
      const exception = new ForbiddenException("Access denied");

      filter.catch(exception, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "FORBIDDEN",
          message: "Access denied",
        }),
      );
    });
  });

  describe("BusinessException", () => {
    it("should handle custom BusinessException with code", () => {
      const exception = new BusinessException(
        "CUSTOM_ERROR",
        "Custom error message",
        HttpStatus.BAD_REQUEST,
        { key: "value" },
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        code: "CUSTOM_ERROR",
        message: "Custom error message",
        timestamp: expect.any(String),
        path: "/test-path",
        traceId: expect.any(String),
        details: { key: "value" },
      });
    });

    it("should handle WorkspaceNotFoundException", () => {
      const exception = new WorkspaceNotFoundException("workspace-123");

      filter.catch(exception, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "WORKSPACE_NOT_FOUND",
          message: expect.stringContaining("workspace-123"),
        }),
      );
    });

    it("should handle InsufficientPermissionException with details", () => {
      const exception = new InsufficientPermissionException(
        "ADMIN",
        "MEMBER",
        "delete workspace",
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "INSUFFICIENT_PERMISSION",
          details: {
            requiredRole: "ADMIN",
            userRole: "MEMBER",
          },
        }),
      );
    });
  });

  describe("Validation errors (class-validator)", () => {
    it("should format class-validator errors correctly", () => {
      const validationError = {
        statusCode: 400,
        message: [
          {
            property: "name",
            constraints: {
              isNotEmpty: "name should not be empty",
            },
          },
          {
            property: "email",
            constraints: {
              isEmail: "email must be an email",
            },
          },
        ],
        error: "Bad Request",
      };

      const exception = new BadRequestException(validationError);

      filter.catch(exception, mockArgumentsHost);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: {
            errors: [
              {
                field: "name",
                constraint: "isNotEmpty",
                message: "name should not be empty",
              },
              {
                field: "email",
                constraint: "isEmail",
                message: "email must be an email",
              },
            ],
          },
        }),
      );
    });

    it("should handle single validation error", () => {
      const validationError = {
        statusCode: 400,
        message: [
          {
            property: "password",
            constraints: {
              minLength: "password must be longer than 8 characters",
            },
          },
        ],
        error: "Bad Request",
      };

      const exception = new BadRequestException(validationError);

      filter.catch(exception, mockArgumentsHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "VALIDATION_ERROR",
          details: {
            errors: expect.arrayContaining([
              expect.objectContaining({
                field: "password",
                constraint: "minLength",
              }),
            ]),
          },
        }),
      );
    });
  });

  describe("Error response format", () => {
    it("should include traceId for error tracking", () => {
      const exception = new NotFoundException();

      filter.catch(exception, mockArgumentsHost);

      const callArg = mockJson.mock.calls[0][0];
      expect(callArg.traceId).toBeDefined();
      expect(typeof callArg.traceId).toBe("string");
      expect(callArg.traceId.length).toBeGreaterThan(0);
    });

    it("should include valid ISO 8601 timestamp", () => {
      const exception = new NotFoundException();

      filter.catch(exception, mockArgumentsHost);

      const callArg = mockJson.mock.calls[0][0];
      expect(callArg.timestamp).toBeDefined();

      // Verify ISO 8601 format
      const date = new Date(callArg.timestamp);
      expect(date.toISOString()).toBe(callArg.timestamp);
    });

    it("should include request path", () => {
      mockRequest.url = "/workspaces/123/members";

      const exception = new NotFoundException();

      filter.catch(exception, mockArgumentsHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "/workspaces/123/members",
        }),
      );
    });

    it("should not include details if not provided", () => {
      const exception = new BusinessException(
        "SIMPLE_ERROR",
        "Simple error without details",
        400,
      );

      filter.catch(exception, mockArgumentsHost);

      const callArg = mockJson.mock.calls[0][0];
      expect(callArg.details).toBeUndefined();
    });

    it("should include details when provided", () => {
      const exception = new BusinessException(
        "ERROR_WITH_DETAILS",
        "Error with additional context",
        400,
        { userId: "user-123", action: "delete" },
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          details: {
            userId: "user-123",
            action: "delete",
          },
        }),
      );
    });
  });

  describe("HTTP status code mapping", () => {
    const testCases = [
      {
        status: 400,
        exception: BadRequestException,
        expectedCode: "BAD_REQUEST",
      },
      {
        status: 401,
        exception: class UnauthorizedException extends BadRequestException {
          constructor() {
            super();
            Object.setPrototypeOf(this, UnauthorizedException.prototype);
          }
          getStatus() {
            return 401;
          }
        },
        expectedCode: "UNAUTHORIZED",
      },
      { status: 403, exception: ForbiddenException, expectedCode: "FORBIDDEN" },
      { status: 404, exception: NotFoundException, expectedCode: "NOT_FOUND" },
    ];

    testCases.forEach(({ status, exception: ExceptionClass, expectedCode }) => {
      it(`should map ${status} to ${expectedCode}`, () => {
        const exception = new ExceptionClass("Test error");

        filter.catch(exception as any, mockArgumentsHost);

        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            code: expectedCode,
          }),
        );
      });
    });
  });

  describe("Edge cases", () => {
    it("should handle exception with string response", () => {
      const exception = new NotFoundException("Simple string error");

      filter.catch(exception, mockArgumentsHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Simple string error",
        }),
      );
    });

    it("should handle exception with object response", () => {
      const exception = new BadRequestException({
        message: "Object error message",
        customField: "value",
      });

      filter.catch(exception, mockArgumentsHost);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Object error message",
        }),
      );
    });

    it("should handle empty exception message", () => {
      const exception = new NotFoundException();

      filter.catch(exception, mockArgumentsHost);

      const callArg = mockJson.mock.calls[0][0];
      expect(callArg.message).toBeDefined();
      expect(typeof callArg.message).toBe("string");
    });
  });
});
