import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { LogService } from "./log.service";
import { YjsService } from "../yjs/yjs.service";

@Injectable()
export class ArchiveScheduler {
  private readonly logger = new Logger(ArchiveScheduler.name);
  private consecutiveArchivalFailures = 0;
  private consecutiveCleanupFailures = 0;
  private readonly MAX_CONSECUTIVE_FAILURES = 3;

  constructor(
    private logService: LogService,
    private yjsService: YjsService,
  ) {}

  // Run at midnight KST (UTC+9) - which is 3 PM UTC
  @Cron("0 15 * * *", {
    timeZone: "UTC",
  })
  async archiveDailyLogs() {
    this.logger.log("Starting daily log archiving...");

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const archived = await this.yjsService.archiveYesterdayLogs(yesterday);

      // Reset failure counter on success
      this.consecutiveArchivalFailures = 0;

      this.logger.log(
        `Successfully archived ${archived} workspace logs for ${yesterday.toISOString().split("T")[0]}`,
        {
          archived,
          date: yesterday.toISOString().split("T")[0],
          consecutiveFailures: 0,
        },
      );
    } catch (error) {
      this.consecutiveArchivalFailures++;

      // Log with appropriate severity based on consecutive failures
      if (this.consecutiveArchivalFailures >= this.MAX_CONSECUTIVE_FAILURES) {
        this.logger.error(
          `🚨 ALERT: Daily log archival has failed ${this.consecutiveArchivalFailures} times consecutively! Manual intervention may be required.`,
          error instanceof Error ? error.stack : undefined,
          "ArchiveScheduler",
          {
            consecutiveFailures: this.consecutiveArchivalFailures,
            lastError: error instanceof Error ? error.message : String(error),
          },
        );
      } else {
        this.logger.error(
          `Failed to archive daily logs (failure ${this.consecutiveArchivalFailures}/${this.MAX_CONSECUTIVE_FAILURES})`,
          error instanceof Error ? error.stack : undefined,
          "ArchiveScheduler",
          {
            consecutiveFailures: this.consecutiveArchivalFailures,
            lastError: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }
  }

  // Run every 6 hours to cleanup orphaned documents from deleted workspaces
  @Cron("0 */6 * * *", {
    timeZone: "UTC",
  })
  async cleanupOrphanedDocuments() {
    this.logger.log("Starting orphaned document cleanup...");

    try {
      const cleaned = await this.yjsService.cleanupOrphanedDocuments();

      // Reset failure counter on success
      this.consecutiveCleanupFailures = 0;

      if (cleaned > 0) {
        this.logger.log(
          `Successfully cleaned up ${cleaned} orphaned documents`,
          {
            cleaned,
            consecutiveFailures: 0,
          },
        );
      } else {
        this.logger.log("No orphaned documents found");
      }
    } catch (error) {
      this.consecutiveCleanupFailures++;

      // Log with appropriate severity based on consecutive failures
      if (this.consecutiveCleanupFailures >= this.MAX_CONSECUTIVE_FAILURES) {
        this.logger.error(
          `🚨 ALERT: Orphaned document cleanup has failed ${this.consecutiveCleanupFailures} times consecutively! Manual intervention may be required.`,
          error instanceof Error ? error.stack : undefined,
          "ArchiveScheduler",
          {
            consecutiveFailures: this.consecutiveCleanupFailures,
            lastError: error instanceof Error ? error.message : String(error),
          },
        );
      } else {
        this.logger.error(
          `Failed to cleanup orphaned documents (failure ${this.consecutiveCleanupFailures}/${this.MAX_CONSECUTIVE_FAILURES})`,
          error instanceof Error ? error.stack : undefined,
          "ArchiveScheduler",
          {
            consecutiveFailures: this.consecutiveCleanupFailures,
            lastError: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }
  }
}
