import { Test, TestingModule } from "@nestjs/testing";
import { LogController } from "./log.controller";
import { LogService } from "./log.service";
import { GetLogDto } from "./dto/get-log.dto";
import { GetLogsRangeDto } from "./dto/get-logs-range.dto";
import { WorkspaceMemberGuard } from "../auth/guards/workspace-member.guard";
import { PrismaService } from "../prisma/prisma.service";

describe("LogController", () => {
  let controller: LogController;
  let logService: LogService;

  const mockUser = {
    id: "user-123",
    githubId: "github-123",
    githubUsername: "testuser",
    email: "test@example.com",
    avatarUrl: "https://github.com/avatar.png",
  };

  const mockLog = {
    id: "log-123",
    workspaceId: "workspace-123",
    date: new Date("2025-01-15"),
    content: "Daily log content",
    createdAt: new Date("2025-01-15"),
    updatedAt: new Date("2025-01-15"),
  };

  const mockLogService = {
    getLog: jest.fn(),
    extractYesterdayTasks: jest.fn(),
    getLogs: jest.fn(),
  };

  const mockPrismaService = {
    workspaceMember: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LogController],
      providers: [
        {
          provide: LogService,
          useValue: mockLogService,
        },
        WorkspaceMemberGuard,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<LogController>(LogController);
    logService = module.get<LogService>(LogService);

    jest.clearAllMocks();

    // Mock workspace membership check to always pass for unit tests
    // (Authorization tests should be in workspace-member.guard.spec.ts)
    mockPrismaService.workspaceMember.findUnique.mockResolvedValue({
      userId: mockUser.id,
      workspaceId: "workspace-123",
      role: "MEMBER",
    });
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("GET /logs/:workspaceId", () => {
    it("should return log for specific date", async () => {
      const dto: GetLogDto = {
        date: "2025-01-15",
      };

      mockLogService.getLog.mockResolvedValue(mockLog);

      const result = await controller.getLog("workspace-123", dto);

      expect(logService.getLog).toHaveBeenCalledWith(
        "workspace-123",
        expect.any(Date),
      );
      expect(logService.getLog).toHaveBeenCalledTimes(1);

      // Verify date is normalized to midnight
      const callArgs = (logService.getLog as jest.Mock).mock.calls[0];
      const passedDate = callArgs[1] as Date;
      expect(passedDate.getHours()).toBe(0);
      expect(passedDate.getMinutes()).toBe(0);
      expect(passedDate.getSeconds()).toBe(0);
      expect(passedDate.getMilliseconds()).toBe(0);

      expect(result).toEqual(mockLog);
    });

    it("should use current date when no date provided", async () => {
      const dto: GetLogDto = {};

      mockLogService.getLog.mockResolvedValue(mockLog);

      const result = await controller.getLog("workspace-123", dto);

      expect(logService.getLog).toHaveBeenCalledWith(
        "workspace-123",
        expect.any(Date),
      );

      // Verify it's today's date normalized to midnight
      const callArgs = (logService.getLog as jest.Mock).mock.calls[0];
      const passedDate = callArgs[1] as Date;
      const today = new Date();
      expect(passedDate.getFullYear()).toBe(today.getFullYear());
      expect(passedDate.getMonth()).toBe(today.getMonth());
      expect(passedDate.getDate()).toBe(today.getDate());
      expect(passedDate.getHours()).toBe(0);
    });

    it("should handle different workspace ids", async () => {
      const dto: GetLogDto = {
        date: "2025-01-10",
      };

      mockLogService.getLog.mockResolvedValue({
        ...mockLog,
        workspaceId: "workspace-456",
      });

      const result = await controller.getLog("workspace-456", dto);

      expect(logService.getLog).toHaveBeenCalledWith(
        "workspace-456",
        expect.any(Date),
      );
    });

    it("should normalize time to midnight", async () => {
      const dto: GetLogDto = {
        date: "2025-01-15T14:30:45.123Z", // Time should be stripped
      };

      mockLogService.getLog.mockResolvedValue(mockLog);

      await controller.getLog("workspace-123", dto);

      const callArgs = (logService.getLog as jest.Mock).mock.calls[0];
      const passedDate = callArgs[1] as Date;
      expect(passedDate.getHours()).toBe(0);
      expect(passedDate.getMinutes()).toBe(0);
      expect(passedDate.getSeconds()).toBe(0);
      expect(passedDate.getMilliseconds()).toBe(0);
    });
  });

  describe("GET /logs/:workspaceId/yesterday-tasks", () => {
    it("should extract yesterday tasks for user", async () => {
      const mockTasks = [
        "- Implemented authentication",
        "- Fixed bug in workspace service",
        "- Updated documentation",
      ];

      const mockRequest = {
        user: mockUser,
      } as any;

      mockLogService.extractYesterdayTasks.mockResolvedValue(mockTasks);

      const result = await controller.getYesterdayTasks(
        "workspace-123",
        mockRequest,
      );

      expect(logService.extractYesterdayTasks).toHaveBeenCalledWith(
        "workspace-123",
        "testuser",
      );
      expect(logService.extractYesterdayTasks).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ tasks: mockTasks });
      expect(result.tasks).toHaveLength(3);
    });

    it("should return empty tasks when no yesterday log exists", async () => {
      const mockRequest = {
        user: mockUser,
      } as any;

      mockLogService.extractYesterdayTasks.mockResolvedValue([]);

      const result = await controller.getYesterdayTasks(
        "workspace-123",
        mockRequest,
      );

      expect(result).toEqual({ tasks: [] });
      expect(result.tasks).toHaveLength(0);
    });

    it("should handle different users", async () => {
      const differentUser = {
        id: "user-456",
        githubId: "github-456",
        githubUsername: "anotheruser",
        email: "another@example.com",
        avatarUrl: null,
      };

      const mockRequest = {
        user: differentUser,
      } as any;

      mockLogService.extractYesterdayTasks.mockResolvedValue([
        "- Different user tasks",
      ]);

      const result = await controller.getYesterdayTasks(
        "workspace-456",
        mockRequest,
      );

      expect(logService.extractYesterdayTasks).toHaveBeenCalledWith(
        "workspace-456",
        "anotheruser",
      );
    });
  });

  describe("GET /logs/:workspaceId/range", () => {
    it("should return logs within date range", async () => {
      const dto: GetLogsRangeDto = {
        startDate: "2025-01-01",
        endDate: "2025-01-31",
      };

      const mockLogs = [
        mockLog,
        {
          ...mockLog,
          id: "log-456",
          date: new Date("2025-01-20"),
        },
      ];

      mockLogService.getLogs.mockResolvedValue(mockLogs);

      const result = await controller.getLogs("workspace-123", dto);

      expect(logService.getLogs).toHaveBeenCalledWith(
        "workspace-123",
        expect.any(Date),
        expect.any(Date),
      );
      expect(logService.getLogs).toHaveBeenCalledTimes(1);

      // Verify start date normalized to 00:00:00
      const callArgs = (logService.getLogs as jest.Mock).mock.calls[0];
      const startDate = callArgs[1] as Date;
      expect(startDate.getHours()).toBe(0);
      expect(startDate.getMinutes()).toBe(0);

      // Verify end date normalized to 23:59:59.999
      const endDate = callArgs[2] as Date;
      expect(endDate.getHours()).toBe(23);
      expect(endDate.getMinutes()).toBe(59);
      expect(endDate.getSeconds()).toBe(59);
      expect(endDate.getMilliseconds()).toBe(999);

      expect(result).toEqual(mockLogs);
      expect(result).toHaveLength(2);
    });

    it("should handle query without date range", async () => {
      const dto: GetLogsRangeDto = {};

      mockLogService.getLogs.mockResolvedValue([mockLog]);

      const result = await controller.getLogs("workspace-123", dto);

      expect(logService.getLogs).toHaveBeenCalledWith(
        "workspace-123",
        undefined,
        undefined,
      );
    });

    it("should handle query with only start date", async () => {
      const dto: GetLogsRangeDto = {
        startDate: "2025-01-01",
      };

      mockLogService.getLogs.mockResolvedValue([mockLog]);

      const result = await controller.getLogs("workspace-123", dto);

      expect(logService.getLogs).toHaveBeenCalledWith(
        "workspace-123",
        expect.any(Date),
        undefined,
      );

      const callArgs = (logService.getLogs as jest.Mock).mock.calls[0];
      const startDate = callArgs[1] as Date;
      expect(startDate).toBeDefined();
      expect(callArgs[2]).toBeUndefined();
    });

    it("should handle query with only end date", async () => {
      const dto: GetLogsRangeDto = {
        endDate: "2025-01-31",
      };

      mockLogService.getLogs.mockResolvedValue([mockLog]);

      const result = await controller.getLogs("workspace-123", dto);

      expect(logService.getLogs).toHaveBeenCalledWith(
        "workspace-123",
        undefined,
        expect.any(Date),
      );

      const callArgs = (logService.getLogs as jest.Mock).mock.calls[0];
      expect(callArgs[1]).toBeUndefined();
      const endDate = callArgs[2] as Date;
      expect(endDate).toBeDefined();
    });

    it("should return empty array when no logs in range", async () => {
      const dto: GetLogsRangeDto = {
        startDate: "2025-01-01",
        endDate: "2025-01-05",
      };

      mockLogService.getLogs.mockResolvedValue([]);

      const result = await controller.getLogs("workspace-123", dto);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe("Error handling", () => {
    it("should propagate service errors on getLog", async () => {
      const dto: GetLogDto = {
        date: "2025-01-15",
      };

      mockLogService.getLog.mockRejectedValue(new Error("Database error"));

      await expect(controller.getLog("workspace-123", dto)).rejects.toThrow(
        "Database error",
      );
    });

    it("should propagate service errors on extractYesterdayTasks", async () => {
      const mockRequest = {
        user: mockUser,
      } as any;

      mockLogService.extractYesterdayTasks.mockRejectedValue(
        new Error("Service error"),
      );

      await expect(
        controller.getYesterdayTasks("workspace-123", mockRequest),
      ).rejects.toThrow("Service error");
    });

    it("should propagate service errors on getLogs", async () => {
      const dto: GetLogsRangeDto = {
        startDate: "2025-01-01",
        endDate: "2025-01-31",
      };

      mockLogService.getLogs.mockRejectedValue(new Error("Query error"));

      await expect(controller.getLogs("workspace-123", dto)).rejects.toThrow(
        "Query error",
      );
    });
  });

  describe("Security: XSS (Cross-Site Scripting) Prevention", () => {
    it("should safely return log content with script tags", async () => {
      const dto: GetLogDto = {
        date: "2025-01-15",
      };

      const maliciousLog = {
        ...mockLog,
        content: "<script>alert('xss')</script>Normal content",
      };

      mockLogService.getLog.mockResolvedValue(maliciousLog);

      const result = await controller.getLog("workspace-123", dto);

      // Controller returns raw content - sanitization should happen at service/client level
      // Test verifies controller doesn't execute or transform malicious content
      expect(result).toBeDefined();
      expect(result.content).toBe(
        "<script>alert('xss')</script>Normal content",
      );
      expect(typeof result.content).toBe("string");
    });

    it("should safely return log content with img onerror injection", async () => {
      const dto: GetLogDto = {
        date: "2025-01-15",
      };

      const maliciousLog = {
        ...mockLog,
        content: "<img src=x onerror=\"alert('xss')\">",
      };

      mockLogService.getLog.mockResolvedValue(maliciousLog);

      const result = await controller.getLog("workspace-123", dto);

      expect(result.content).toBe("<img src=x onerror=\"alert('xss')\">");
    });

    it("should safely return log content with iframe injection", async () => {
      const dto: GetLogDto = {
        date: "2025-01-15",
      };

      const maliciousLog = {
        ...mockLog,
        content: "<iframe src=\"javascript:alert('xss')\"></iframe>",
      };

      mockLogService.getLog.mockResolvedValue(maliciousLog);

      const result = await controller.getLog("workspace-123", dto);

      expect(result.content).toBe(
        "<iframe src=\"javascript:alert('xss')\"></iframe>",
      );
    });

    it("should safely return log content with event handler injection", async () => {
      const dto: GetLogDto = {
        date: "2025-01-15",
      };

      const maliciousLog = {
        ...mockLog,
        content:
          "<div onload=\"alert('xss')\" onclick=\"alert('click')\">Content</div>",
      };

      mockLogService.getLog.mockResolvedValue(maliciousLog);

      const result = await controller.getLog("workspace-123", dto);

      expect(result.content).toContain("onload");
      expect(result.content).toContain("onclick");
    });

    it("should safely return log content with javascript: protocol", async () => {
      const dto: GetLogDto = {
        date: "2025-01-15",
      };

      const maliciousLog = {
        ...mockLog,
        content: "<a href=\"javascript:alert('xss')\">Click me</a>",
      };

      mockLogService.getLog.mockResolvedValue(maliciousLog);

      const result = await controller.getLog("workspace-123", dto);

      expect(result.content).toBe(
        "<a href=\"javascript:alert('xss')\">Click me</a>",
      );
    });

    it("should safely handle XSS in yesterday tasks extraction", async () => {
      const mockRequest = {
        user: mockUser,
      } as any;

      // Service should return sanitized task text without executing scripts
      const taskWithScript = [
        "<script>alert('xss')</script>Implement feature",
        "Fix bug <img src=x onerror=alert('xss')>",
      ];

      mockLogService.extractYesterdayTasks.mockResolvedValue(taskWithScript);

      const result = await controller.getYesterdayTasks(
        "workspace-123",
        mockRequest,
      );

      // Verify tasks are returned as strings without execution
      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0]).toBe(
        "<script>alert('xss')</script>Implement feature",
      );
      expect(result.tasks[1]).toBe("Fix bug <img src=x onerror=alert('xss')>");
    });

    it("should safely return multiple logs with XSS content in range query", async () => {
      const dto: GetLogsRangeDto = {
        startDate: "2025-01-01",
        endDate: "2025-01-31",
      };

      const maliciousLogs = [
        {
          ...mockLog,
          content: "<script>alert('xss1')</script>Log 1",
        },
        {
          ...mockLog,
          id: "log-456",
          content: "<img src=x onerror=alert('xss2')>Log 2",
        },
        {
          ...mockLog,
          id: "log-789",
          content: "Normal log content",
        },
      ];

      mockLogService.getLogs.mockResolvedValue(maliciousLogs);

      const result = await controller.getLogs("workspace-123", dto);

      // Verify all logs are returned without executing XSS
      expect(result).toHaveLength(3);
      expect(result[0].content).toBe("<script>alert('xss1')</script>Log 1");
      expect(result[1].content).toBe("<img src=x onerror=alert('xss2')>Log 2");
      expect(result[2].content).toBe("Normal log content");
    });

    it("should handle log content with encoded XSS attempts", async () => {
      const dto: GetLogDto = {
        date: "2025-01-15",
      };

      const maliciousLog = {
        ...mockLog,
        content: "&lt;script&gt;alert('xss')&lt;/script&gt;",
      };

      mockLogService.getLog.mockResolvedValue(maliciousLog);

      const result = await controller.getLog("workspace-123", dto);

      // HTML entities should remain as-is (not double-encoded)
      expect(result.content).toBe("&lt;script&gt;alert('xss')&lt;/script&gt;");
    });

    it("should handle log content with SVG-based XSS", async () => {
      const dto: GetLogDto = {
        date: "2025-01-15",
      };

      const maliciousLog = {
        ...mockLog,
        content: '<svg onload="alert(\'xss\')"><circle r="10"/></svg>',
      };

      mockLogService.getLog.mockResolvedValue(maliciousLog);

      const result = await controller.getLog("workspace-123", dto);

      expect(result.content).toContain("svg");
      expect(result.content).toContain("onload");
    });

    it("should handle log content with data: URI XSS", async () => {
      const dto: GetLogDto = {
        date: "2025-01-15",
      };

      const maliciousLog = {
        ...mockLog,
        content:
          "<a href=\"data:text/html,<script>alert('xss')</script>\">Click</a>",
      };

      mockLogService.getLog.mockResolvedValue(maliciousLog);

      const result = await controller.getLog("workspace-123", dto);

      expect(result.content).toContain("data:text/html");
    });

    it("should verify controller returns data without transformation", async () => {
      const dto: GetLogDto = {
        date: "2025-01-15",
      };

      // Various XSS vectors in single log
      const complexMaliciousLog = {
        ...mockLog,
        content: `
# Daily Log
<script>alert('xss')</script>
<img src=x onerror=alert('xss')>
<iframe src="javascript:alert('xss')"></iframe>
[Click me](javascript:alert('xss'))
<svg onload="alert('xss')"></svg>
Normal markdown content
- [ ] Task with <script>alert('task')</script>
`,
      };

      mockLogService.getLog.mockResolvedValue(complexMaliciousLog);

      const result = await controller.getLog("workspace-123", dto);

      // Controller should pass through content as-is
      // Sanitization is responsibility of:
      // 1. Client-side: When rendering markdown/HTML
      // 2. Service-layer: When storing (optional validation)
      expect(result.content).toBe(complexMaliciousLog.content);
      expect(result.content).toContain("<script>");
      expect(result.content).toContain("<img");
      expect(result.content).toContain("<iframe");
      expect(result.content).toContain("javascript:");
      expect(result.content).toContain("<svg");
    });

    it("should handle XSS in markdown links and images", async () => {
      const dto: GetLogDto = {
        date: "2025-01-15",
      };

      const maliciousLog = {
        ...mockLog,
        content: `
![XSS](javascript:alert('xss'))
[Click](javascript:alert('xss'))
![](x" onerror="alert('xss'))
`,
      };

      mockLogService.getLog.mockResolvedValue(maliciousLog);

      const result = await controller.getLog("workspace-123", dto);

      // Verify controller returns raw markdown without executing
      expect(result.content).toContain("javascript:alert");
      expect(result.content).toContain('onerror="alert');
    });
  });
});
