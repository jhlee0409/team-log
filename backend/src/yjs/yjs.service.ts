import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Y from 'yjs';
import { WebSocketServer } from 'ws';
import { setupWSConnection, setPersistence, docs } from 'y-websocket/bin/utils';
import { LogService } from '../log/log.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class YjsService implements OnModuleInit {
  private readonly logger = new Logger(YjsService.name);
  private wss: WebSocketServer;

  constructor(
    private logService: LogService,
    private prisma: PrismaService,
  ) {}

  onModuleInit() {
    const port = parseInt(process.env.YJS_PORT || '1234', 10);

    this.wss = new WebSocketServer({ port });

    this.wss.on('connection', (ws, req) => {
      setupWSConnection(ws, req);
    });

    this.logger.log(`✅ Yjs WebSocket server running on ws://localhost:${port}`);
  }

  /**
   * Archive yesterday's Yjs documents to PostgreSQL
   * Room format: workspaceId-YYYY-MM-DD
   */
  async archiveYesterdayLogs(yesterday: Date): Promise<number> {
    const dateStr = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD
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
          const yText = doc.getText('content');
          const content = yText.toString();

          // Only save if there's content
          if (content.trim()) {
            await this.logService.saveLog(workspace.id, yesterday, content);
            this.logger.log(`Archived log for workspace ${workspace.id}, date ${dateStr}`);
            archivedCount++;
          }

          // Destroy the document to free memory
          doc.destroy();
          docs.delete(roomName);
          this.logger.log(`Destroyed Yjs document: ${roomName}`);
        } catch (error) {
          this.logger.error(`Failed to archive log for room ${roomName}`, error);
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
    const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
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
}
