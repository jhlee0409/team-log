import { Test, TestingModule } from "@nestjs/testing";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

describe("HealthController", () => {
  let controller: HealthController;
  let service: HealthService;

  const mockHealthService = {
    check: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: mockHealthService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    service = module.get<HealthService>(HealthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("check", () => {
    it("should return healthy status when all services are up", async () => {
      // Arrange
      const healthyResult = {
        status: "healthy" as const,
        timestamp: "2025-01-01T00:00:00.000Z",
        uptime: 3600,
        checks: {
          database: { status: "up" as const, responseTime: 10 },
          yjsWebSocket: { status: "up" as const },
        },
      };

      mockHealthService.check.mockResolvedValue(healthyResult);

      // Act
      const result = await controller.check();

      // Assert
      expect(result).toEqual(healthyResult);
      expect(result.status).toBe("healthy");
      expect(result.checks.database.status).toBe("up");
      expect(result.checks.yjsWebSocket.status).toBe("up");
      expect(service.check).toHaveBeenCalledTimes(1);
    });

    it("should return unhealthy status when database is down", async () => {
      // Arrange
      const unhealthyResult = {
        status: "unhealthy" as const,
        timestamp: "2025-01-01T00:00:00.000Z",
        uptime: 3600,
        checks: {
          database: {
            status: "down" as const,
            error: "Connection refused",
          },
          yjsWebSocket: { status: "up" as const },
        },
      };

      mockHealthService.check.mockResolvedValue(unhealthyResult);

      // Act
      const result = await controller.check();

      // Assert
      expect(result).toEqual(unhealthyResult);
      expect(result.status).toBe("unhealthy");
      expect(result.checks.database.status).toBe("down");
      expect(result.checks.database.error).toBe("Connection refused");
      expect(service.check).toHaveBeenCalledTimes(1);
    });

    it("should return unhealthy status when Yjs WebSocket is down", async () => {
      // Arrange
      const unhealthyResult = {
        status: "unhealthy" as const,
        timestamp: "2025-01-01T00:00:00.000Z",
        uptime: 3600,
        checks: {
          database: { status: "up" as const, responseTime: 10 },
          yjsWebSocket: {
            status: "down" as const,
            error: "WebSocket server not initialized",
          },
        },
      };

      mockHealthService.check.mockResolvedValue(unhealthyResult);

      // Act
      const result = await controller.check();

      // Assert
      expect(result).toEqual(unhealthyResult);
      expect(result.status).toBe("unhealthy");
      expect(result.checks.yjsWebSocket.status).toBe("down");
      expect(service.check).toHaveBeenCalledTimes(1);
    });
  });
});
