import { Test, TestingModule } from '@nestjs/testing';
import { LogService } from './log.service';
import { PrismaService } from '../prisma/prisma.service';

describe('LogService', () => {
  let service: LogService;
  let prismaService: PrismaService;

  const mockDate = new Date('2025-01-15');
  const mockWorkspaceId = 'workspace-1';

  const mockDailyLog = {
    id: 'log-1',
    workspaceId: mockWorkspaceId,
    date: mockDate,
    content: 'Test log content',
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
    service['memoryLogs'].clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getLog', () => {
    it('should return log from memory for today', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const logKey = `${mockWorkspaceId}_${today.toISOString()}`;
      const memoryLog = 'In-memory log content';
      service['memoryLogs'].set(logKey, memoryLog);

      const result = await service.getLog(mockWorkspaceId, today);

      expect(result.content).toBe(memoryLog);
      expect(result.isFromMemory).toBe(true);
      expect(mockPrismaService.dailyLog.findUnique).not.toHaveBeenCalled();
    });

    it('should return log from database for past dates', async () => {
      const pastDate = new Date('2025-01-10');
      pastDate.setHours(0, 0, 0, 0);

      mockPrismaService.dailyLog.findUnique.mockResolvedValue(mockDailyLog);

      const result = await service.getLog(mockWorkspaceId, pastDate);

      expect(result).toEqual(mockDailyLog);
      expect(mockPrismaService.dailyLog.findUnique).toHaveBeenCalledWith({
        where: {
          workspaceId_date: {
            workspaceId: mockWorkspaceId,
            date: pastDate,
          },
        },
      });
    });

    it('should return empty content if log not found in database', async () => {
      const pastDate = new Date('2025-01-10');
      pastDate.setHours(0, 0, 0, 0);

      mockPrismaService.dailyLog.findUnique.mockResolvedValue(null);

      const result = await service.getLog(mockWorkspaceId, pastDate);

      expect(result).toEqual({
        workspaceId: mockWorkspaceId,
        date: pastDate,
        content: '',
      });
    });
  });

  describe('getLogs', () => {
    it('should return logs within date range', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-15');

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
          date: 'desc',
        },
      });
    });

    it('should return all logs if no date range specified', async () => {
      mockPrismaService.dailyLog.findMany.mockResolvedValue([mockDailyLog]);

      const result = await service.getLogs(mockWorkspaceId);

      expect(result).toEqual([mockDailyLog]);
      expect(mockPrismaService.dailyLog.findMany).toHaveBeenCalledWith({
        where: {
          workspaceId: mockWorkspaceId,
        },
        orderBy: {
          date: 'desc',
        },
      });
    });
  });

  describe('extractYesterdayTasks', () => {
    const mockUsername = 'testuser';

    it('should extract tasks for user from yesterday log', async () => {
      const yesterdayContent = `
## @testuser
- [x] Completed task 1
- [ ] Incomplete task

## @otheruser
- [x] Other user task
      `.trim();

      mockPrismaService.dailyLog.findUnique.mockResolvedValue({
        ...mockDailyLog,
        content: yesterdayContent,
      });

      const result = await service.extractYesterdayTasks(
        mockWorkspaceId,
        mockUsername,
      );

      expect(result).toEqual(['Completed task 1']);
    });

    it('should return empty array if no tasks found', async () => {
      mockPrismaService.dailyLog.findUnique.mockResolvedValue({
        ...mockDailyLog,
        content: '## @testuser\n- [ ] Incomplete task',
      });

      const result = await service.extractYesterdayTasks(
        mockWorkspaceId,
        mockUsername,
      );

      expect(result).toEqual([]);
    });

    it('should return empty array if no log found', async () => {
      mockPrismaService.dailyLog.findUnique.mockResolvedValue(null);

      const result = await service.extractYesterdayTasks(
        mockWorkspaceId,
        mockUsername,
      );

      expect(result).toEqual([]);
    });
  });
});
