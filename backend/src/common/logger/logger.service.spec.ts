import { LoggerService } from "./logger.service";

// Mock winston module
const mockWinstonLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
};

jest.mock("winston", () => ({
  createLogger: jest.fn(() => mockWinstonLogger),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    colorize: jest.fn(),
    simple: jest.fn(),
  },
  transports: {
    Console: jest.fn(),
  },
}));

jest.mock("winston-daily-rotate-file", () => {
  return jest.fn();
});

describe("LoggerService", () => {
  let service: LoggerService;

  beforeEach(() => {
    // Clear all mock calls before each test
    jest.clearAllMocks();

    service = new LoggerService("TestContext");
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("log (info level)", () => {
    it("should log info message with default context", () => {
      service.log("Test info message");

      expect(mockWinstonLogger.info).toHaveBeenCalledWith("Test info message", {
        context: "TestContext",
      });
    });

    it("should log info message with custom context", () => {
      service.log("Test info message", "CustomContext");

      expect(mockWinstonLogger.info).toHaveBeenCalledWith("Test info message", {
        context: "CustomContext",
      });
    });

    it("should log info message with metadata", () => {
      const meta = { userId: "user-123", action: "login" };

      service.log("User logged in", "AuthService", meta);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith("User logged in", {
        context: "AuthService",
        userId: "user-123",
        action: "login",
      });
    });
  });

  describe("error", () => {
    it("should log error message with stack trace", () => {
      const errorMessage = "Database connection failed";
      const stackTrace = "Error: Database connection failed\n  at ...";

      service.error(errorMessage, stackTrace);

      expect(mockWinstonLogger.error).toHaveBeenCalledWith(errorMessage, {
        context: "TestContext",
        trace: stackTrace,
      });
    });

    it("should log error with custom context and metadata", () => {
      const meta = { operation: "create", table: "users" };

      service.error(
        "Query failed",
        "Error stack trace",
        "DatabaseService",
        meta,
      );

      expect(mockWinstonLogger.error).toHaveBeenCalledWith("Query failed", {
        context: "DatabaseService",
        trace: "Error stack trace",
        operation: "create",
        table: "users",
      });
    });

    it("should handle error without stack trace", () => {
      service.error("Simple error message");

      expect(mockWinstonLogger.error).toHaveBeenCalledWith(
        "Simple error message",
        {
          context: "TestContext",
          trace: undefined,
        },
      );
    });
  });

  describe("warn", () => {
    it("should log warning message", () => {
      service.warn("Deprecated API used");

      expect(mockWinstonLogger.warn).toHaveBeenCalledWith(
        "Deprecated API used",
        {
          context: "TestContext",
        },
      );
    });

    it("should log warning with metadata", () => {
      service.warn("Rate limit approaching", "RateLimitService", {
        current: 95,
        limit: 100,
      });

      expect(mockWinstonLogger.warn).toHaveBeenCalledWith(
        "Rate limit approaching",
        {
          context: "RateLimitService",
          current: 95,
          limit: 100,
        },
      );
    });
  });

  describe("debug", () => {
    it("should log debug message", () => {
      service.debug("Debug information", "DebugContext");

      expect(mockWinstonLogger.debug).toHaveBeenCalledWith(
        "Debug information",
        {
          context: "DebugContext",
        },
      );
    });

    it("should log debug with complex metadata", () => {
      const meta = {
        requestId: "req-123",
        payload: { key: "value" },
        headers: { "user-agent": "test" },
      };

      service.debug("Request details", "HTTP", meta);

      expect(mockWinstonLogger.debug).toHaveBeenCalledWith("Request details", {
        context: "HTTP",
        requestId: "req-123",
        payload: { key: "value" },
        headers: { "user-agent": "test" },
      });
    });
  });

  describe("verbose", () => {
    it("should log verbose message", () => {
      service.verbose("Verbose logging enabled");

      expect(mockWinstonLogger.verbose).toHaveBeenCalledWith(
        "Verbose logging enabled",
        {
          context: "TestContext",
        },
      );
    });

    it("should log verbose with metadata", () => {
      service.verbose("Cache hit", "CacheService", {
        key: "user:123",
        ttl: 3600,
      });

      expect(mockWinstonLogger.verbose).toHaveBeenCalledWith("Cache hit", {
        context: "CacheService",
        key: "user:123",
        ttl: 3600,
      });
    });
  });

  describe("context management", () => {
    it("should use default context when not provided", () => {
      service.log("Message without custom context");

      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        "Message without custom context",
        {
          context: "TestContext",
        },
      );
    });

    it("should override default context when provided", () => {
      service.log("Message with override", "OverrideContext");

      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        "Message with override",
        {
          context: "OverrideContext",
        },
      );
    });

    it("should work without default context", () => {
      const serviceWithoutContext = new LoggerService();

      serviceWithoutContext.log("Message", "ProvidedContext");

      expect(mockWinstonLogger.info).toHaveBeenCalledWith("Message", {
        context: "ProvidedContext",
      });
    });
  });

  describe("NestJS LoggerService compatibility", () => {
    it("should implement all required NestJS LoggerService methods", () => {
      expect(typeof service.log).toBe("function");
      expect(typeof service.error).toBe("function");
      expect(typeof service.warn).toBe("function");
      expect(typeof service.debug).toBe("function");
      expect(typeof service.verbose).toBe("function");
    });
  });
});
