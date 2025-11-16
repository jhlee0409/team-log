import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import * as Y from "yjs";
import { WebSocketServer } from "ws";
import { setupWSConnection, setPersistence, docs } from "y-websocket/bin/utils";
import { LogService } from "../log/log.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class YjsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(YjsService.name);
  private wss: WebSocketServer;

  constructor(
    private logService: LogService,
    private prisma: PrismaService,
  ) {}

  onModuleInit() {
    const port = parseInt(process.env.YJS_PORT || "1234", 10);

    this.wss = new WebSocketServer({ port });

    this.wss.on("connection", (ws, req) => {
      setupWSConnection(ws, req);
    });

    this.logger.log(
      `✅ Yjs WebSocket server running on ws://localhost:${port}`,
    );
  }

  async onModuleDestroy() {
    this.logger.log("Shutting down Yjs WebSocket server...");

    // Step 1: Close WebSocket server first to prevent new connections
    await new Promise<void>((resolve) => {
      if (this.wss) {
        this.wss.close(() => {
          this.logger.log("Yjs WebSocket server closed - no new connections");
          resolve();
        });
      } else {
        resolve();
      }
    });

    // Step 2: Take snapshot of all documents before iteration to avoid race conditions
    const docsSnapshot: Array<[string, Y.Doc]> = Array.from(docs.entries());
    let archivedCount = 0;

    // Step 3: Archive all active documents
    try {
      for (const [roomName, doc] of docsSnapshot) {
        try {
          // Extract workspace ID and date from room name (format: workspaceId-YYYY-MM-DD)
          const parts = roomName.split("-");
          if (parts.length >= 4) {
            // workspaceId might contain hyphens
            const dateStr = parts.slice(-3).join("-"); // Last 3 parts are YYYY-MM-DD
            const workspaceId = parts.slice(0, -3).join("-");
            const date = new Date(dateStr);

            // Get content from Yjs document
            const yText = doc.getText("content");
            const content = yText.toString();

            // Save if there's content
            if (content.trim()) {
              await this.logService.saveLog(workspaceId, date, content);
              archivedCount++;
              this.logger.log(`Archived document on shutdown: ${roomName}`);
            }

            // Clean up
            doc.destroy();
            docs.delete(roomName);
          }
        } catch (error) {
          this.logger.error(
            `Failed to archive document ${roomName} on shutdown`,
            error,
          );
        }
      }

      if (archivedCount > 0) {
        this.logger.log(
          `Archived ${archivedCount} active documents on shutdown`,
        );
      }
    } catch (error) {
      this.logger.error("Error during document archival on shutdown", error);
    }
  }

  /**
   * Archive yesterday's Yjs documents to PostgreSQL
   * Room format: workspaceId-YYYY-MM-DD
   */
  async archiveYesterdayLogs(yesterday: Date): Promise<number> {
    const dateStr = yesterday.toISOString().split("T")[0]; // YYYY-MM-DD
    let archivedCount = 0;

    // Get all active workspaces
    const workspaces = await this.prisma.workspace.findMany({
      select: { id: true },
    });

    for (const workspace of workspaces) {
      const roomName = `${workspace.id}-${dateStr}`;

      // Check if this room exists in memory
      const doc = docs.get(roomName);

      if (doc) {
        try {
          // Convert Yjs document to text
          const yText = doc.getText("content");
          const content = yText.toString();

          // Only save if there's content
          if (content.trim()) {
            await this.logService.saveLog(workspace.id, yesterday, content);
            this.logger.log(
              `Archived log for workspace ${workspace.id}, date ${dateStr}`,
            );
            archivedCount++;
          }

          // Destroy the document to free memory
          doc.destroy();
          docs.delete(roomName);
          this.logger.log(`Destroyed Yjs document: ${roomName}`);
        } catch (error) {
          this.logger.error(
            `Failed to archive log for room ${roomName}`,
            error,
          );
        }
      }
    }

    return archivedCount;
  }

  /**
   * Get room name for a workspace and date
   */
  getRoomName(workspaceId: string, date?: Date): string {
    const d = date || new Date();
    const dateStr = d.toISOString().split("T")[0]; // YYYY-MM-DD
    return `${workspaceId}-${dateStr}`;
  }

  /**
   * Get or create a Yjs document for a room
   */
  getDocument(roomName: string): Y.Doc {
    let doc = docs.get(roomName);

    if (!doc) {
      doc = new Y.Doc();
      docs.set(roomName, doc);
      this.logger.log(`Created new Yjs document: ${roomName}`);
    }

    return doc;
  }

  /**
   * Check if WebSocket server is running (for health checks)
   */
  isWebSocketServerRunning(): boolean {
    return this.wss !== undefined && this.wss !== null;
  }
}
