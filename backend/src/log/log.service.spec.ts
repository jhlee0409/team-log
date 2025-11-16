import { Test, TestingModule } from "@nestjs/testing";
import { LogService } from "./log.service";
import { PrismaService } from "../prisma/prisma.service";

describe("LogService", () => {
  let service: LogService;
  let prismaService: PrismaService;

  const mockDate = new Date("2025-01-15");
  const mockWorkspaceId = "workspace-1";

  const mockDailyLog = {
    id: "log-1",
    workspaceId: mockWorkspaceId,
    date: mockDate,
    content: "Test log content",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    dailyLog: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LogService>(LogService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Clear in-memory storage before each test
    if (service["memoryLogs"]) {
      service["memoryLogs"].clear();
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("saveLog", () => {
    it("should create new log when log does not exist", async () => {
      const date = new Date("2025-01-10");
      date.setHours(0, 0, 0, 0);
      const content = "New daily log content";

      mockPrismaService.dailyLog.upsert.mockResolvedValue({
        ...mockDailyLog,
        content,
        date,
      });

      const result = await service.saveLog(mockWorkspaceId, date, content);

      expect(result.content).toBe(content);
      expect(mockPrismaService.dailyLog.upsert).toHaveBeenCalledWith({
        where: {
          workspaceId_date: {
            workspaceId: mockWorkspaceId,
            date: date,
          },
        },
        update: {
          content,
        },
        create: {
          workspaceId: mockWorkspaceId,
          date,
          content,
        },
      });
    });

    it("should update existing log when log exists", async () => {
      const date = new Date("2025-01-10");
      date.setHours(0, 0, 0, 0);
      const updatedContent = "Updated log content";

      mockPrismaService.dailyLog.upsert.mockResolvedValue({
        ...mockDailyLog,
        content: updatedContent,
        date,
      });

      const result = await service.saveLog(mockWorkspaceId, date, updatedContent);

      expect(result.content).toBe(updatedContent);
      expect(mockPrismaService.dailyLog.upsert).toHaveBeenCalledWith({
        where: {
          workspaceId_date: {
            workspaceId: mockWorkspaceId,
            date: date,
          },
        },
        update: {
          content: updatedContent,
        },
        create: {
          workspaceId: mockWorkspaceId,
          date,
          content: updatedContent,
        },
      });
    });

    it("should save log with empty content", async () => {
      const date = new Date("2025-01-10");
      date.setHours(0, 0, 0, 0);
      const emptyContent = "";

      mockPrismaService.dailyLog.upsert.mockResolvedValue({
        ...mockDailyLog,
        content: emptyContent,
        date,
      });

      const result = await service.saveLog(mockWorkspaceId, date, emptyContent);

      expect(result.content).toBe(emptyContent);
    });

    it("should handle saving for different workspaces", async () => {
      const workspace2 = "workspace-2";
      const date = new Date("2025-01-10");
      const content = "Workspace 2 content";

      mockPrismaService.dailyLog.upsert.mockResolvedValue({
        id: "log-2",
        workspaceId: workspace2,
        date,
        content,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.saveLog(workspace2, date, content);

      expect(result.workspaceId).toBe(workspace2);
      expect(mockPrismaService.dailyLog.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            workspaceId_date: {
              workspaceId: workspace2,
              date,
            },
          },
        }),
      );
    });
  });

  describe("getLog", () => {
    it("should return log from database when found", async () => {
      const date = new Date("2025-01-10");
      date.setHours(0, 0, 0, 0);

      mockPrismaService.dailyLog.findUnique.mockResolvedValue(mockDailyLog);

      const result = await service.getLog(mockWorkspaceId, date);

      expect(result).toEqual(mockDailyLog);
      expect(mockPrismaService.dailyLog.findUnique).toHaveBeenCalledWith({
        where: {
          workspaceId_date: {
            workspaceId: mockWorkspaceId,
            date: date,
          },
        },
      });
    });

    it("should return null if log not found in database", async () => {
      const date = new Date("2025-01-10");
      date.setHours(0, 0, 0, 0);

      mockPrismaService.dailyLog.findUnique.mockResolvedValue(null);

      const result = await service.getLog(mockWorkspaceId, date);

      expect(result).toBeNull();
      expect(mockPrismaService.dailyLog.findUnique).toHaveBeenCalledWith({
        where: {
          workspaceId_date: {
            workspaceId: mockWorkspaceId,
            date: date,
          },
        },
      });
    });

    it("should query database for today's log", async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      mockPrismaService.dailyLog.findUnique.mockResolvedValue(mockDailyLog);

      const result = await service.getLog(mockWorkspaceId, today);

      expect(result).toEqual(mockDailyLog);
      expect(mockPrismaService.dailyLog.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  describe("getLogs", () => {
    it("should return logs within date range", async () => {
      const startDate = new Date("2025-01-01");
      const endDate = new Date("2025-01-15");

      mockPrismaService.dailyLog.findMany.mockResolvedValue([mockDailyLog]);

      const result = await service.getLogs(mockWorkspaceId, startDate, endDate);

      expect(result).toEqual([mockDailyLog]);
      expect(mockPrismaService.dailyLog.findMany).toHaveBeenCalledWith({
        where: {
          workspaceId: mockWorkspaceId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          date: "desc",
        },
      });
    });

    it("should return all logs if no date range specified", async () => {
      mockPrismaService.dailyLog.findMany.mockResolvedValue([mockDailyLog]);

      const result = await service.getLogs(mockWorkspaceId);

      expect(result).toEqual([mockDailyLog]);
      expect(mockPrismaService.dailyLog.findMany).toHaveBeenCalledWith({
        where: {
          workspaceId: mockWorkspaceId,
        },
        orderBy: {
          date: "desc",
        },
      });
    });
  });

  describe("extractYesterdayTasks", () => {
    const mockUsername = "testuser";

    it("should extract unchecked tasks for user from yesterday log", async () => {
      const yesterdayContent = `
### @testuser
- [x] Completed task (checked)
- [ ] Incomplete task 1
- [ ] Incomplete task 2

### @otheruser
- [ ] Other user task
      `.trim();

      mockPrismaService.dailyLog.findUnique.mockResolvedValue({
        ...mockDailyLog,
        content: yesterdayContent,
      });

      const result = await service.extractYesterdayTasks(
        mockWorkspaceId,
        mockUsername,
      );

      expect(result).toEqual(["Incomplete task 1", "Incomplete task 2"]);
    });

    it("should return empty array if only checked tasks found", async () => {
      mockPrismaService.dailyLog.findUnique.mockResolvedValue({
        ...mockDailyLog,
        content: "### @testuser\n- [x] Completed task\n- [x] Another completed",
      });

      const result = await service.extractYesterdayTasks(
        mockWorkspaceId,
        mockUsername,
      );

      expect(result).toEqual([]);
    });

    it("should return empty array if no log found", async () => {
      mockPrismaService.dailyLog.findUnique.mockResolvedValue(null);

      const result = await service.extractYesterdayTasks(
        mockWorkspaceId,
        mockUsername,
      );

      expect(result).toEqual([]);
    });
  });
});
