import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { LogService } from "./log.service";
import { YjsService } from "../yjs/yjs.service";

@Injectable()
export class ArchiveScheduler {
  private readonly logger = new Logger(ArchiveScheduler.name);

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

      this.logger.log(
        `Successfully archived ${archived} workspace logs for ${yesterday.toISOString().split("T")[0]}`,
      );
    } catch (error) {
      this.logger.error("Failed to archive daily logs", error);
    }
  }
}
