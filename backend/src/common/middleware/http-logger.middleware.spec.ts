import { HttpLoggerMiddleware } from "./http-logger.middleware";
import { Request, Response, NextFunction } from "express";

// Mock LoggerService
const mockLoggerService = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
};

jest.mock("../logger/logger.service", () => {
  return {
    LoggerService: jest.fn(() => mockLoggerService),
  };
});

// Mock uuid
jest.mock("uuid", () => ({
  v4: jest.fn(() => "mock-request-id-123"),
}));

describe("HttpLoggerMiddleware", () => {
  let middleware: HttpLoggerMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let finishCallback: () => void;

  beforeEach(() => {
    jest.clearAllMocks();

    middleware = new HttpLoggerMiddleware();

    // Mock request
    mockRequest = {
      method: "GET",
      originalUrl: "/api/workspaces",
      body: {},
      headers: {
        "user-agent": "Mozilla/5.0",
      },
      ip: "127.0.0.1",
    };

    // Mock response with event emitter simulation
    const responseEventHandlers: { [key: string]: () => void } = {};
    mockResponse = {
      statusCode: 200,
      setHeader: jest.fn(),
      on: jest.fn((event: string, handler: () => void) => {
        responseEventHandlers[event] = handler;
        return mockResponse as Response;
      }),
    };

    // Store finish callback for manual triggering
    finishCallback = () => {
      if (responseEventHandlers["finish"]) {
        responseEventHandlers["finish"]();
      }
    };

    mockNext = jest.fn();

    // Mock Date.now for consistent timing tests
    jest.spyOn(Date, "now").mockReturnValueOnce(1000).mockReturnValueOnce(1150);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Request logging", () => {
    it("should log incoming request with method and path", () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockLoggerService.log).toHaveBeenCalledWith(
        "Incoming request",
        "HTTP",
        expect.objectContaining({
          method: "GET",
          path: "/api/workspaces",
        }),
      );
    });

    it("should log request with user agent and IP", () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockLoggerService.log).toHaveBeenCalledWith(
        "Incoming request",
        "HTTP",
        expect.objectContaining({
          userAgent: "Mozilla/5.0",
          ip: "127.0.0.1",
        }),
      );
    });

    it("should log request body when present", () => {
      mockRequest.body = { name: "Test Workspace" };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockLoggerService.log).toHaveBeenCalledWith(
        "Incoming request",
        "HTTP",
        expect.objectContaining({
          body: { name: "Test Workspace" },
        }),
      );
    });

    it("should call next() to continue request pipeline", () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it("should generate and add request ID to response header", () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "X-Request-ID",
        "mock-request-id-123",
      );
    });

    it("should use existing request ID from header if present", () => {
      mockRequest.headers = {
        ...mockRequest.headers,
        "x-request-id": "existing-request-id",
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "X-Request-ID",
        "existing-request-id",
      );
    });

    it("should include request ID in incoming request log", () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockLoggerService.log).toHaveBeenCalledWith(
        "Incoming request",
        "HTTP",
        expect.objectContaining({
          requestId: "mock-request-id-123",
        }),
      );
    });
  });

  describe("Response logging", () => {
    it("should log successful response with 200 status", () => {
      mockResponse.statusCode = 200;

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Trigger finish event
      finishCallback();

      expect(mockLoggerService.log).toHaveBeenCalledWith(
        "Request completed",
        "HTTP",
        expect.objectContaining({
          requestId: "mock-request-id-123",
          method: "GET",
          path: "/api/workspaces",
          statusCode: 200,
          duration: 150,
        }),
      );
    });

    it("should log client error response with 400 status as warn", () => {
      mockResponse.statusCode = 400;

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      finishCallback();

      expect(mockLoggerService.warn).toHaveBeenCalledWith(
        "Request completed",
        "HTTP",
        expect.objectContaining({
          statusCode: 400,
        }),
      );
    });

    it("should log client error response with 404 status as warn", () => {
      mockResponse.statusCode = 404;

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      finishCallback();

      expect(mockLoggerService.warn).toHaveBeenCalledWith(
        "Request completed",
        "HTTP",
        expect.objectContaining({
          statusCode: 404,
        }),
      );
    });

    it("should log error response with 500 status as error", () => {
      mockResponse.statusCode = 500;

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      finishCallback();

      expect(mockLoggerService.error).toHaveBeenCalledWith(
        "Request completed",
        undefined,
        "HTTP",
        expect.objectContaining({
          statusCode: 500,
        }),
      );
    });

    it("should calculate request duration correctly", () => {
      // Date.now mocked to return 1000, then 1150
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      finishCallback();

      expect(mockLoggerService.log).toHaveBeenCalledWith(
        "Request completed",
        "HTTP",
        expect.objectContaining({
          duration: 150,
        }),
      );
    });
  });

  describe("Sensitive data masking", () => {
    it("should mask password field", () => {
      mockRequest.body = {
        username: "testuser",
        password: "secretPassword123",
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockLoggerService.log).toHaveBeenCalledWith(
        "Incoming request",
        "HTTP",
        expect.objectContaining({
          body: {
            username: "testuser",
            password: "***MASKED***",
          },
        }),
      );
    });

    it("should mask token field", () => {
      mockRequest.body = {
        githubToken: "ghp_abc123xyz789",
        data: "public data",
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockLoggerService.log).toHaveBeenCalledWith(
        "Incoming request",
        "HTTP",
        expect.objectContaining({
          body: {
            githubToken: "***MASKED***",
            data: "public data",
          },
        }),
      );
    });

    it("should mask secret field", () => {
      mockRequest.body = {
        apiSecret: "sk_live_12345",
        name: "Test",
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockLoggerService.log).toHaveBeenCalledWith(
        "Incoming request",
        "HTTP",
        expect.objectContaining({
          body: {
            apiSecret: "***MASKED***",
            name: "Test",
          },
        }),
      );
    });

    it("should mask apiKey field", () => {
      mockRequest.body = {
        publicApiKey: "pk_test_abc",
        userId: "user-123",
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockLoggerService.log).toHaveBeenCalledWith(
        "Incoming request",
        "HTTP",
        expect.objectContaining({
          body: {
            publicApiKey: "***MASKED***",
            userId: "user-123",
          },
        }),
      );
    });

    it("should mask multiple sensitive fields", () => {
      mockRequest.body = {
        username: "testuser",
        password: "pass123",
        accessToken: "token123",
        apiSecret: "secret123",
        publicData: "visible",
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockLoggerService.log).toHaveBeenCalledWith(
        "Incoming request",
        "HTTP",
        expect.objectContaining({
          body: {
            username: "testuser",
            password: "***MASKED***",
            accessToken: "***MASKED***",
            apiSecret: "***MASKED***",
            publicData: "visible",
          },
        }),
      );
    });

    it("should handle case-insensitive sensitive key matching", () => {
      mockRequest.body = {
        PASSWORD: "uppercase",
        Token: "mixedcase",
        secret: "lowercase",
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockLoggerService.log).toHaveBeenCalledWith(
        "Incoming request",
        "HTTP",
        expect.objectContaining({
          body: {
            PASSWORD: "***MASKED***",
            Token: "***MASKED***",
            secret: "***MASKED***",
          },
        }),
      );
    });

    it("should handle empty body", () => {
      mockRequest.body = {};

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockLoggerService.log).toHaveBeenCalledWith(
        "Incoming request",
        "HTTP",
        expect.objectContaining({
          body: {},
        }),
      );
    });

    it("should handle null body", () => {
      mockRequest.body = null;

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockLoggerService.log).toHaveBeenCalled();
    });

    it("should handle undefined body", () => {
      mockRequest.body = undefined;

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockLoggerService.log).toHaveBeenCalled();
    });

    it("should handle non-object body (string)", () => {
      mockRequest.body = "plain string body";

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockLoggerService.log).toHaveBeenCalledWith(
        "Incoming request",
        "HTTP",
        expect.objectContaining({
          body: "plain string body",
        }),
      );
    });
  });

  describe("Different HTTP methods", () => {
    it("should log POST request", () => {
      mockRequest.method = "POST";
      mockRequest.originalUrl = "/api/auth/login";

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockLoggerService.log).toHaveBeenCalledWith(
        "Incoming request",
        "HTTP",
        expect.objectContaining({
          method: "POST",
          path: "/api/auth/login",
        }),
      );
    });

    it("should log PUT request", () => {
      mockRequest.method = "PUT";
      mockRequest.originalUrl = "/api/workspaces/123";

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockLoggerService.log).toHaveBeenCalledWith(
        "Incoming request",
        "HTTP",
        expect.objectContaining({
          method: "PUT",
        }),
      );
    });

    it("should log DELETE request", () => {
      mockRequest.method = "DELETE";

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockLoggerService.log).toHaveBeenCalledWith(
        "Incoming request",
        "HTTP",
        expect.objectContaining({
          method: "DELETE",
        }),
      );
    });
  });
});
