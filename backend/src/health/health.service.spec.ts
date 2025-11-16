import { Test, TestingModule } from "@nestjs/testing";
import { HealthService } from "./health.service";
import { PrismaService } from "../prisma/prisma.service";
import { YjsService } from "../yjs/yjs.service";

describe("HealthService", () => {
  let service: HealthService;
  let prismaService: PrismaService;
  let yjsService: YjsService;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
  };

  const mockYjsService = {
    isWebSocketServerRunning: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: YjsService,
          useValue: mockYjsService,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    prismaService = module.get<PrismaService>(PrismaService);
    yjsService = module.get<YjsService>(YjsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("check", () => {
    it("should return healthy status when all services are up", async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
      mockYjsService.isWebSocketServerRunning.mockReturnValue(true);

      // Act
      const result = await service.check();

      // Assert
      expect(result.status).toBe("healthy");
      expect(result.checks.database.status).toBe("up");
      expect(result.checks.database.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.checks.yjsWebSocket.status).toBe("up");
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeDefined();
      expect(prismaService.$queryRaw).toHaveBeenCalledTimes(1);
      expect(yjsService.isWebSocketServerRunning).toHaveBeenCalledTimes(1);
    });

    it("should return unhealthy status when database is down", async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockRejectedValue(
        new Error("Connection refused"),
      );
      mockYjsService.isWebSocketServerRunning.mockReturnValue(true);

      // Act
      const result = await service.check();

      // Assert
      expect(result.status).toBe("unhealthy");
      expect(result.checks.database.status).toBe("down");
      expect(result.checks.database.error).toBe("Connection refused");
      expect(result.checks.yjsWebSocket.status).toBe("up");
      expect(prismaService.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it("should return unhealthy status when Yjs WebSocket is down", async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
      mockYjsService.isWebSocketServerRunning.mockReturnValue(false);

      // Act
      const result = await service.check();

      // Assert
      expect(result.status).toBe("unhealthy");
      expect(result.checks.database.status).toBe("up");
      expect(result.checks.yjsWebSocket.status).toBe("down");
      expect(result.checks.yjsWebSocket.error).toBe(
        "WebSocket server not initialized",
      );
      expect(yjsService.isWebSocketServerRunning).toHaveBeenCalledTimes(1);
    });

    it("should return unhealthy status when both services are down", async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockRejectedValue(new Error("DB Error"));
      mockYjsService.isWebSocketServerRunning.mockReturnValue(false);

      // Act
      const result = await service.check();

      // Assert
      expect(result.status).toBe("unhealthy");
      expect(result.checks.database.status).toBe("down");
      expect(result.checks.database.error).toBe("DB Error");
      expect(result.checks.yjsWebSocket.status).toBe("down");
    });

    it("should handle Yjs WebSocket check errors gracefully", async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
      mockYjsService.isWebSocketServerRunning.mockImplementation(() => {
        throw new Error("Unexpected error");
      });

      // Act
      const result = await service.check();

      // Assert
      expect(result.status).toBe("unhealthy");
      expect(result.checks.yjsWebSocket.status).toBe("down");
      expect(result.checks.yjsWebSocket.error).toBe("Unexpected error");
    });

    it("should include uptime in response", async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
      mockYjsService.isWebSocketServerRunning.mockReturnValue(true);

      // Add small delay to ensure uptime > 0
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Act
      const result = await service.check();

      // Assert
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(typeof result.uptime).toBe("number");
    });

    it("should include timestamp in ISO format", async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
      mockYjsService.isWebSocketServerRunning.mockReturnValue(true);

      // Act
      const result = await service.check();

      // Assert
      expect(result.timestamp).toBeDefined();
      expect(() => new Date(result.timestamp)).not.toThrow();
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });
});
