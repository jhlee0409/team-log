import { Test, TestingModule } from "@nestjs/testing";
import { YjsService } from "./yjs.service";
import { LogService } from "../log/log.service";
import { PrismaService } from "../prisma/prisma.service";
import * as Y from "yjs";
import { docs } from "y-websocket/bin/utils";

describe("YjsService", () => {
  let service: YjsService;
  let logService: LogService;
  let prismaService: PrismaService;

  const mockLogService = {
    saveLog: jest.fn(),
    getLog: jest.fn(),
  };

  const mockPrismaService = {
    workspace: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    // Clear all Yjs documents before each test
    docs.clear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YjsService,
        {
          provide: LogService,
          useValue: mockLogService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<YjsService>(YjsService);
    logService = module.get<LogService>(LogService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up all Yjs documents after each test
    docs.clear();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getRoomName", () => {
    it("should generate room name with workspace ID and date", () => {
      const workspaceId = "workspace-123";
      const date = new Date("2025-01-15T10:30:00Z");

      const roomName = service.getRoomName(workspaceId, date);

      expect(roomName).toBe("workspace-123-2025-01-15");
    });

    it("should use current date when date not provided", () => {
      const workspaceId = "workspace-456";
      const today = new Date();
      const expectedDateStr = today.toISOString().split("T")[0];

      const roomName = service.getRoomName(workspaceId);

      expect(roomName).toBe(`workspace-456-${expectedDateStr}`);
    });

    it("should handle different workspace IDs", () => {
      const date = new Date("2025-01-20T00:00:00Z");

      const room1 = service.getRoomName("ws-1", date);
      const room2 = service.getRoomName("ws-2", date);
      const room3 = service.getRoomName("team-alpha", date);

      expect(room1).toBe("ws-1-2025-01-20");
      expect(room2).toBe("ws-2-2025-01-20");
      expect(room3).toBe("team-alpha-2025-01-20");
    });

    it("should handle different dates for same workspace", () => {
      const workspaceId = "workspace-999";

      const room1 = service.getRoomName(workspaceId, new Date("2025-01-01"));
      const room2 = service.getRoomName(workspaceId, new Date("2025-01-15"));
      const room3 = service.getRoomName(workspaceId, new Date("2025-02-01"));

      expect(room1).toBe("workspace-999-2025-01-01");
      expect(room2).toBe("workspace-999-2025-01-15");
      expect(room3).toBe("workspace-999-2025-02-01");
    });

    it("should normalize date to YYYY-MM-DD format", () => {
      const workspaceId = "workspace-123";

      // Test with time included (should be stripped)
      const dateWithTime = new Date("2025-01-15T23:59:59.999Z");
      const roomName = service.getRoomName(workspaceId, dateWithTime);

      expect(roomName).toBe("workspace-123-2025-01-15");
    });
  });

  describe("getDocument", () => {
    it("should create new Yjs document if not exists", () => {
      const roomName = "workspace-123-2025-01-15";

      const doc = service.getDocument(roomName);

      expect(doc).toBeDefined();
      expect(doc).toBeInstanceOf(Y.Doc);
      expect(docs.get(roomName)).toBe(doc);
    });

    it("should return existing Yjs document if already created", () => {
      const roomName = "workspace-456-2025-01-20";

      // Create document first time
      const doc1 = service.getDocument(roomName);

      // Get same document second time
      const doc2 = service.getDocument(roomName);

      expect(doc2).toBe(doc1);
      expect(docs.size).toBe(1);
    });

    it("should create separate documents for different rooms", () => {
      const room1 = "workspace-1-2025-01-15";
      const room2 = "workspace-2-2025-01-15";
      const room3 = "workspace-1-2025-01-16";

      const doc1 = service.getDocument(room1);
      const doc2 = service.getDocument(room2);
      const doc3 = service.getDocument(room3);

      expect(doc1).not.toBe(doc2);
      expect(doc1).not.toBe(doc3);
      expect(doc2).not.toBe(doc3);
      expect(docs.size).toBe(3);
    });

    it("should allow adding content to Yjs document", () => {
      const roomName = "workspace-test-2025-01-15";

      const doc = service.getDocument(roomName);
      const yText = doc.getText("content");

      yText.insert(0, "Hello from Yjs!");

      expect(yText.toString()).toBe("Hello from Yjs!");
    });

    it("should allow multiple clients to edit same document", () => {
      const roomName = "workspace-collab-2025-01-15";

      // Client 1 gets document
      const doc = service.getDocument(roomName);
      const yText1 = doc.getText("content");

      yText1.insert(0, "Client 1: ");

      // Client 2 gets same document
      const doc2 = service.getDocument(roomName);
      const yText2 = doc2.getText("content");

      yText2.insert(10, "editing");

      // Both should see the merged result
      expect(yText1.toString()).toBe("Client 1: editing");
      expect(yText2.toString()).toBe("Client 1: editing");
    });
  });

  describe("archiveYesterdayLogs", () => {
    it("should archive logs from active workspaces with content", async () => {
      const yesterday = new Date("2025-01-14");

      // Setup mock workspaces
      mockPrismaService.workspace.findMany.mockResolvedValue([
        { id: "workspace-1" },
        { id: "workspace-2" },
      ]);

      // Create Yjs documents with content
      const room1 = "workspace-1-2025-01-14";
      const room2 = "workspace-2-2025-01-14";

      const doc1 = service.getDocument(room1);
      const doc2 = service.getDocument(room2);

      doc1.getText("content").insert(0, "Log content for workspace 1");
      doc2.getText("content").insert(0, "Log content for workspace 2");

      mockLogService.saveLog.mockResolvedValue(undefined);

      const count = await service.archiveYesterdayLogs(yesterday);

      expect(count).toBe(2);
      expect(logService.saveLog).toHaveBeenCalledTimes(2);
      expect(logService.saveLog).toHaveBeenCalledWith(
        "workspace-1",
        yesterday,
        "Log content for workspace 1",
      );
      expect(logService.saveLog).toHaveBeenCalledWith(
        "workspace-2",
        yesterday,
        "Log content for workspace 2",
      );

      // Documents should be destroyed
      expect(docs.get(room1)).toBeUndefined();
      expect(docs.get(room2)).toBeUndefined();
    });

    it("should skip workspaces without Yjs documents", async () => {
      const yesterday = new Date("2025-01-14");

      mockPrismaService.workspace.findMany.mockResolvedValue([
        { id: "workspace-1" },
        { id: "workspace-2" },
        { id: "workspace-3" },
      ]);

      // Only create document for workspace-1
      const room1 = "workspace-1-2025-01-14";
      const doc1 = service.getDocument(room1);
      doc1.getText("content").insert(0, "Only workspace 1 has content");

      mockLogService.saveLog.mockResolvedValue(undefined);

      const count = await service.archiveYesterdayLogs(yesterday);

      expect(count).toBe(1);
      expect(logService.saveLog).toHaveBeenCalledTimes(1);
      expect(logService.saveLog).toHaveBeenCalledWith(
        "workspace-1",
        yesterday,
        "Only workspace 1 has content",
      );
    });

    it("should skip documents with empty content", async () => {
      const yesterday = new Date("2025-01-14");

      mockPrismaService.workspace.findMany.mockResolvedValue([
        { id: "workspace-1" },
        { id: "workspace-2" },
      ]);

      // Create documents but only add content to workspace-1
      const room1 = "workspace-1-2025-01-14";
      const room2 = "workspace-2-2025-01-14";

      const doc1 = service.getDocument(room1);
      const doc2 = service.getDocument(room2);

      doc1.getText("content").insert(0, "Has content");
      // doc2 has empty content

      mockLogService.saveLog.mockResolvedValue(undefined);

      const count = await service.archiveYesterdayLogs(yesterday);

      expect(count).toBe(1);
      expect(logService.saveLog).toHaveBeenCalledTimes(1);
    });

    it("should skip documents with only whitespace", async () => {
      const yesterday = new Date("2025-01-14");

      mockPrismaService.workspace.findMany.mockResolvedValue([
        { id: "workspace-1" },
      ]);

      const room = "workspace-1-2025-01-14";
      const doc = service.getDocument(room);
      doc.getText("content").insert(0, "   \n\n\t  ");

      const count = await service.archiveYesterdayLogs(yesterday);

      expect(count).toBe(0);
      expect(logService.saveLog).not.toHaveBeenCalled();
    });

    it("should handle saveLog errors gracefully", async () => {
      const yesterday = new Date("2025-01-14");

      mockPrismaService.workspace.findMany.mockResolvedValue([
        { id: "workspace-1" },
        { id: "workspace-2" },
      ]);

      const room1 = "workspace-1-2025-01-14";
      const room2 = "workspace-2-2025-01-14";

      const doc1 = service.getDocument(room1);
      const doc2 = service.getDocument(room2);

      doc1.getText("content").insert(0, "Content 1");
      doc2.getText("content").insert(0, "Content 2");

      // First save fails, second succeeds
      mockLogService.saveLog
        .mockRejectedValueOnce(new Error("Database error"))
        .mockResolvedValueOnce(undefined);

      const count = await service.archiveYesterdayLogs(yesterday);

      // Should continue despite error
      expect(count).toBe(1);
      expect(logService.saveLog).toHaveBeenCalledTimes(2);
    });

    it("should return 0 when no workspaces exist", async () => {
      const yesterday = new Date("2025-01-14");

      mockPrismaService.workspace.findMany.mockResolvedValue([]);

      const count = await service.archiveYesterdayLogs(yesterday);

      expect(count).toBe(0);
      expect(logService.saveLog).not.toHaveBeenCalled();
    });

    it("should handle complex Yjs content", async () => {
      const yesterday = new Date("2025-01-14");

      mockPrismaService.workspace.findMany.mockResolvedValue([
        { id: "workspace-1" },
      ]);

      const room = "workspace-1-2025-01-14";
      const doc = service.getDocument(room);
      const yText = doc.getText("content");

      // Simulate multiple edits
      yText.insert(0, "# Daily Log\n\n");
      yText.insert(yText.length, "## Morning\n");
      yText.insert(yText.length, "- Task 1\n");
      yText.insert(yText.length, "- Task 2\n");

      mockLogService.saveLog.mockResolvedValue(undefined);

      const count = await service.archiveYesterdayLogs(yesterday);

      expect(count).toBe(1);
      expect(logService.saveLog).toHaveBeenCalledWith(
        "workspace-1",
        yesterday,
        "# Daily Log\n\n## Morning\n- Task 1\n- Task 2\n",
      );
    });

    it("should handle concurrent document creation and archival", async () => {
      const yesterday = new Date("2025-01-14");

      mockPrismaService.workspace.findMany.mockResolvedValue([
        { id: "workspace-1" },
      ]);

      const room = "workspace-1-2025-01-14";

      // Simulate rapid concurrent edits
      const doc = service.getDocument(room);
      const yText = doc.getText("content");

      yText.insert(0, "Edit 1\n");
      yText.insert(yText.length, "Edit 2\n");
      yText.insert(yText.length, "Edit 3\n");

      mockLogService.saveLog.mockResolvedValue(undefined);

      const count = await service.archiveYesterdayLogs(yesterday);

      expect(count).toBe(1);
      expect(logService.saveLog).toHaveBeenCalledWith(
        "workspace-1",
        yesterday,
        "Edit 1\nEdit 2\nEdit 3\n",
      );
    });
  });

  describe("Integration: Room lifecycle", () => {
    it("should handle complete room lifecycle", async () => {
      const workspaceId = "workspace-lifecycle";
      const date = new Date("2025-01-15");

      // 1. Get room name
      const roomName = service.getRoomName(workspaceId, date);
      expect(roomName).toBe("workspace-lifecycle-2025-01-15");

      // 2. Create document
      const doc = service.getDocument(roomName);
      expect(docs.has(roomName)).toBe(true);

      // 3. Add content
      const yText = doc.getText("content");
      yText.insert(0, "Daily log content");

      // 4. Verify content
      expect(yText.toString()).toBe("Daily log content");

      // 5. Archive (simulate)
      mockPrismaService.workspace.findMany.mockResolvedValue([
        { id: workspaceId },
      ]);
      mockLogService.saveLog.mockResolvedValue(undefined);

      const count = await service.archiveYesterdayLogs(date);

      expect(count).toBe(1);
      expect(docs.has(roomName)).toBe(false); // Document destroyed
    });

    it("should handle multiple rooms for same workspace on different dates", async () => {
      const workspaceId = "workspace-multi";

      const date1 = new Date("2025-01-10");
      const date2 = new Date("2025-01-11");
      const date3 = new Date("2025-01-12");

      const room1 = service.getRoomName(workspaceId, date1);
      const room2 = service.getRoomName(workspaceId, date2);
      const room3 = service.getRoomName(workspaceId, date3);

      const doc1 = service.getDocument(room1);
      const doc2 = service.getDocument(room2);
      const doc3 = service.getDocument(room3);

      doc1.getText("content").insert(0, "Day 1");
      doc2.getText("content").insert(0, "Day 2");
      doc3.getText("content").insert(0, "Day 3");

      expect(docs.size).toBe(3);
      expect(doc1.getText("content").toString()).toBe("Day 1");
      expect(doc2.getText("content").toString()).toBe("Day 2");
      expect(doc3.getText("content").toString()).toBe("Day 3");
    });
  });
});
