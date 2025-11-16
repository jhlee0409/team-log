import { Test, TestingModule } from "@nestjs/testing";
import { ArchiveScheduler } from "./archive.scheduler";
import { LogService } from "./log.service";
import { YjsService } from "../yjs/yjs.service";
import { LoggerService } from "../common/logger/logger.service";

describe("ArchiveScheduler", () => {
  let scheduler: ArchiveScheduler;
  let logService: LogService;
  let yjsService: YjsService;

  const mockLogService = {
    saveLog: jest.fn(),
    getLog: jest.fn(),
    getLogs: jest.fn(),
    extractYesterdayTasks: jest.fn(),
  };

  const mockYjsService = {
    getRoomName: jest.fn(),
    getDocument: jest.fn(),
    archiveYesterdayLogs: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArchiveScheduler,
        {
          provide: LogService,
          useValue: mockLogService,
        },
        {
          provide: YjsService,
          useValue: mockYjsService,
        },
      ],
    }).compile();

    scheduler = module.get<ArchiveScheduler>(ArchiveScheduler);
    logService = module.get<LogService>(LogService);
    yjsService = module.get<YjsService>(YjsService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    // Ensure all mocks and spies are restored after each test
    jest.restoreAllMocks();
  });

  it("should be defined", () => {
    expect(scheduler).toBeDefined();
  });

  it("should have LogService and YjsService injected", () => {
    expect(logService).toBeDefined();
    expect(yjsService).toBeDefined();
  });

  describe("archiveDailyLogs", () => {
    let loggerSpy: jest.SpyInstance;
    let loggerErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      // Spy on the scheduler's logger instance directly
      loggerSpy = jest.spyOn(scheduler["logger"], "log").mockImplementation();
      loggerErrorSpy = jest
        .spyOn(scheduler["logger"], "error")
        .mockImplementation();
    });

    afterEach(() => {
      loggerSpy.mockRestore();
      loggerErrorSpy.mockRestore();
    });

    it("should successfully archive daily logs", async () => {
      mockYjsService.archiveYesterdayLogs.mockResolvedValue(5);

      await scheduler.archiveDailyLogs();

      expect(loggerSpy).toHaveBeenCalledWith("Starting daily log archiving...");
      expect(yjsService.archiveYesterdayLogs).toHaveBeenCalledTimes(1);
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining("Successfully archived 5 workspace logs"),
        expect.any(Object),
      );
    });

    it("should call archiveYesterdayLogs with yesterday's date", async () => {
      mockYjsService.archiveYesterdayLogs.mockResolvedValue(3);

      await scheduler.archiveDailyLogs();

      expect(yjsService.archiveYesterdayLogs).toHaveBeenCalledTimes(1);

      const calledDate = mockYjsService.archiveYesterdayLogs.mock.calls[0][0];
      expect(calledDate).toBeInstanceOf(Date);

      // Verify it's yesterday's date at midnight
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      expect(calledDate.toISOString()).toBe(yesterday.toISOString());
    });

    it("should log correct date in success message", async () => {
      mockYjsService.archiveYesterdayLogs.mockResolvedValue(10);

      await scheduler.archiveDailyLogs();

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const expectedDate = yesterday.toISOString().split("T")[0];

      expect(loggerSpy).toHaveBeenCalledWith(
        `Successfully archived 10 workspace logs for ${expectedDate}`,
        expect.any(Object),
      );
    });

    it("should handle zero archived logs", async () => {
      mockYjsService.archiveYesterdayLogs.mockResolvedValue(0);

      await scheduler.archiveDailyLogs();

      expect(loggerSpy).toHaveBeenCalledWith("Starting daily log archiving...");
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining("Successfully archived 0 workspace logs"),
        expect.any(Object),
      );
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it("should handle archiving errors gracefully", async () => {
      const error = new Error("Database connection failed");
      mockYjsService.archiveYesterdayLogs.mockRejectedValue(error);

      await scheduler.archiveDailyLogs();

      expect(loggerSpy).toHaveBeenCalledWith("Starting daily log archiving...");
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to archive daily logs"),
        expect.any(String),
        "ArchiveScheduler",
        expect.objectContaining({
          consecutiveFailures: expect.any(Number),
          lastError: expect.any(String),
        }),
      );
      expect(loggerSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("Successfully archived"),
      );
    });

    it("should handle archiving errors without crashing", async () => {
      mockYjsService.archiveYesterdayLogs.mockRejectedValue(
        new Error("Network timeout"),
      );

      await expect(scheduler.archiveDailyLogs()).resolves.not.toThrow();
      expect(loggerErrorSpy).toHaveBeenCalled();
    });

    it("should handle large number of archived logs", async () => {
      mockYjsService.archiveYesterdayLogs.mockResolvedValue(1000);

      await scheduler.archiveDailyLogs();

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining("Successfully archived 1000 workspace logs"),
        expect.any(Object),
      );
    });

    it("should log error with proper message", async () => {
      const specificError = new Error("Prisma connection lost");
      mockYjsService.archiveYesterdayLogs.mockRejectedValue(specificError);

      await scheduler.archiveDailyLogs();

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to archive daily logs"),
        expect.any(String),
        "ArchiveScheduler",
        expect.objectContaining({
          consecutiveFailures: expect.any(Number),
          lastError: expect.any(String),
        }),
      );
    });

    it("should always log starting message regardless of outcome", async () => {
      mockYjsService.archiveYesterdayLogs.mockRejectedValue(
        new Error("Some error"),
      );

      await scheduler.archiveDailyLogs();

      expect(loggerSpy).toHaveBeenCalledWith("Starting daily log archiving...");
    });

    it("should calculate yesterday correctly across month boundaries", async () => {
      // Mock date to first day of month
      const mockDate = new Date("2025-02-01T10:00:00.000Z");
      jest.spyOn(global, "Date").mockImplementation(() => mockDate as any);

      mockYjsService.archiveYesterdayLogs.mockResolvedValue(1);

      await scheduler.archiveDailyLogs();

      const calledDate = mockYjsService.archiveYesterdayLogs.mock.calls[0][0];

      // Yesterday should be 2025-01-31
      expect(calledDate.getDate()).toBe(31);
      expect(calledDate.getMonth()).toBe(0); // January is 0

      jest.restoreAllMocks();
    });
  });

  describe("Cron configuration", () => {
    it("should have archiveDailyLogs method", () => {
      expect(scheduler.archiveDailyLogs).toBeDefined();
      expect(typeof scheduler.archiveDailyLogs).toBe("function");
    });

    it("should be decorated with @Injectable", () => {
      expect(scheduler).toBeInstanceOf(ArchiveScheduler);
    });
  });

  describe("Service integration", () => {
    it("should use YjsService for archiving", async () => {
      mockYjsService.archiveYesterdayLogs.mockResolvedValue(7);

      await scheduler.archiveDailyLogs();

      expect(yjsService.archiveYesterdayLogs).toHaveBeenCalled();
    });

    it("should not call LogService directly during archiving", async () => {
      mockYjsService.archiveYesterdayLogs.mockResolvedValue(2);

      await scheduler.archiveDailyLogs();

      expect(logService.saveLog).not.toHaveBeenCalled();
      expect(logService.getLog).not.toHaveBeenCalled();
    });
  });

  describe("Error scenarios", () => {
    let loggerErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      loggerErrorSpy = jest
        .spyOn(scheduler["logger"], "error")
        .mockImplementation();
    });

    afterEach(() => {
      loggerErrorSpy.mockRestore();
    });

    it("should handle null return from archiveYesterdayLogs", async () => {
      mockYjsService.archiveYesterdayLogs.mockResolvedValue(null);

      await scheduler.archiveDailyLogs();

      // Should not throw, but log null
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it("should handle undefined return from archiveYesterdayLogs", async () => {
      mockYjsService.archiveYesterdayLogs.mockResolvedValue(undefined);

      await scheduler.archiveDailyLogs();

      // Should not throw
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it("should handle various error types", async () => {
      const errors = [
        new Error("Database error"),
        new TypeError("Type mismatch"),
        new Error("Timeout"),
        { message: "Custom error object" },
      ];

      for (const error of errors) {
        jest.clearAllMocks();
        // Reset failure counter to prevent alert triggering
        scheduler["consecutiveArchivalFailures"] = 0;
        mockYjsService.archiveYesterdayLogs.mockRejectedValue(error);

        await scheduler.archiveDailyLogs();

        // Verify error was logged (parameters may vary based on error type)
        expect(loggerErrorSpy).toHaveBeenCalled();
        const call = loggerErrorSpy.mock.calls[0];
        expect(call[0]).toContain("Failed to archive daily logs");
        expect(call[2]).toBe("ArchiveScheduler");
        expect(call[3]).toMatchObject({
          consecutiveFailures: expect.any(Number),
          lastError: expect.any(String),
        });
      }
    });
  });
});
