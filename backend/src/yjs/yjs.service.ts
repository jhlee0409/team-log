import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import * as Y from "yjs";
import { WebSocketServer } from "ws";
import { setupWSConnection, docs } from "y-websocket/bin/utils";
import { LogService } from "../log/log.service";
import { PrismaService } from "../prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { UserService } from "../user/user.service";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { parse as parseUrl } from "url";

@Injectable()
export class YjsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(YjsService.name);
  private wss: WebSocketServer;

  constructor(
    private logService: LogService,
    private prisma: PrismaService,
    private jwtService: JwtService,
    private userService: UserService,
  ) {}

  onModuleInit() {
    const port = parseInt(process.env.YJS_PORT || "1234", 10);

    this.wss = new WebSocketServer({ port });

    this.wss.on("connection", async (ws, req) => {
      try {
        // Step 1: Extract JWT token from query parameter or headers
        const token = this.extractToken(req);
        if (!token) {
          this.logger.warn("WebSocket connection rejected: No token provided");
          ws.close(4001, "Authentication required");
          return;
        }

        // Step 2: Verify JWT and extract user
        const user = await this.verifyToken(token);
        if (!user) {
          this.logger.warn("WebSocket connection rejected: Invalid token");
          ws.close(4001, "Invalid token");
          return;
        }

        // Step 3: Extract room name from URL
        const roomName = this.extractRoomName(req.url);
        if (!roomName) {
          this.logger.warn(
            "WebSocket connection rejected: No room name in URL",
          );
          ws.close(4002, "Room name required");
          return;
        }

        // Step 4: Extract workspaceId from room name (format: workspaceId-YYYY-MM-DD)
        const workspaceId = this.extractWorkspaceIdFromRoom(roomName);
        if (!workspaceId) {
          this.logger.warn(
            `WebSocket connection rejected: Invalid room format: ${roomName}`,
          );
          ws.close(4002, "Invalid room format");
          return;
        }

        // Step 5: Verify workspace membership
        const isMember = await this.verifyWorkspaceMembership(
          workspaceId,
          user.id,
        );
        if (!isMember) {
          this.logger.warn(
            `WebSocket connection rejected: User ${user.id} not member of workspace ${workspaceId}`,
          );
          ws.close(4003, "Not authorized for this workspace");
          return;
        }

        // Step 6: Authentication and authorization successful - setup connection
        this.logger.log(
          `WebSocket authenticated: user=${user.githubUsername}, workspace=${workspaceId}, room=${roomName}`,
        );
        setupWSConnection(ws, req);
      } catch (error) {
        this.logger.error("WebSocket authentication failed", error);
        ws.close(4000, "Authentication failed");
      }
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
   * Cleanup orphaned documents for deleted workspaces
   * This prevents memory leaks from documents that were created for workspaces
   * that have since been deleted
   */
  async cleanupOrphanedDocuments(): Promise<number> {
    // Get all active workspace IDs
    const activeWorkspaces = await this.prisma.workspace.findMany({
      select: { id: true },
    });
    const activeWorkspaceIds = new Set(activeWorkspaces.map((w) => w.id));

    let cleanedCount = 0;

    // Iterate through all in-memory documents
    for (const [roomName, doc] of docs.entries()) {
      try {
        // Extract workspaceId from room name (format: workspaceId-YYYY-MM-DD)
        const workspaceId = this.extractWorkspaceIdFromRoom(roomName);

        if (!workspaceId) {
          // Invalid room name format - clean it up
          this.logger.warn(
            `Cleaning up document with invalid room format: ${roomName}`,
          );
          doc.destroy();
          docs.delete(roomName);
          cleanedCount++;
          continue;
        }

        // Check if workspace still exists
        if (!activeWorkspaceIds.has(workspaceId)) {
          // Workspace has been deleted - clean up its document
          this.logger.log(
            `Cleaning up orphaned document for deleted workspace: ${roomName}`,
          );

          // Try to archive the content first (if it exists)
          try {
            const yText = doc.getText("content");
            const content = yText.toString();

            // Extract date from room name for archival
            if (content.trim()) {
              const parts = roomName.split("-");
              if (parts.length >= 4) {
                const dateStr = parts.slice(-3).join("-");
                const date = new Date(dateStr);

                // Archive the content even though workspace is deleted
                // (for data retention/audit purposes)
                await this.logService.saveLog(workspaceId, date, content);
                this.logger.log(
                  `Archived orphaned document before cleanup: ${roomName}`,
                );
              }
            }
          } catch (archiveError) {
            this.logger.warn(
              `Could not archive orphaned document ${roomName}`,
              archiveError instanceof Error
                ? archiveError.message
                : String(archiveError),
            );
          }

          // Destroy and remove the document
          doc.destroy();
          docs.delete(roomName);
          cleanedCount++;
        }
      } catch (error) {
        this.logger.error(
          `Error cleaning up document ${roomName}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} orphaned documents`);
    }

    return cleanedCount;
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

  /**
   * Extract JWT token from WebSocket request
   * Supports query parameter (?token=...) and Authorization header
   */
  private extractToken(req: any): string | null {
    try {
      // Try query parameter first (e.g., ws://localhost:1234?token=...)
      const url = parseUrl(req.url || "", true);
      if (url.query && url.query.token) {
        return Array.isArray(url.query.token)
          ? url.query.token[0]
          : url.query.token;
      }

      // Try Authorization header
      const authHeader = req.headers?.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        return authHeader.substring(7);
      }

      return null;
    } catch (error) {
      this.logger.error("Error extracting token", error);
      return null;
    }
  }

  /**
   * Verify JWT token and return user
   */
  private async verifyToken(token: string): Promise<any> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      const user = await this.userService.findById(payload.sub);
      return user;
    } catch (error) {
      this.logger.warn(
        "JWT verification failed",
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  }

  /**
   * Extract room name from WebSocket URL
   * URL format: ws://localhost:1234/room-name?token=...
   */
  private extractRoomName(url: string | undefined): string | null {
    if (!url) return null;

    try {
      const parsedUrl = parseUrl(url, true);
      const pathname = parsedUrl.pathname;

      if (!pathname || pathname === "/") {
        return null;
      }

      // Remove leading slash
      return pathname.substring(1);
    } catch (error) {
      this.logger.error("Error extracting room name", error);
      return null;
    }
  }

  /**
   * Extract workspaceId from room name
   * Room format: workspaceId-YYYY-MM-DD
   */
  private extractWorkspaceIdFromRoom(roomName: string): string | null {
    try {
      const parts = roomName.split("-");
      if (parts.length < 4) {
        return null;
      }

      // Last 3 parts are YYYY-MM-DD, everything before is workspaceId
      return parts.slice(0, -3).join("-");
    } catch (error) {
      this.logger.error("Error extracting workspace ID", error);
      return null;
    }
  }

  /**
   * Verify user is a member of the workspace
   */
  private async verifyWorkspaceMembership(
    workspaceId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      const member = await this.prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId,
            workspaceId,
          },
        },
      });

      return member !== null;
    } catch (error) {
      this.logger.error("Error verifying workspace membership", error);
      return false;
    }
  }
}
