import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

// Maximum log content size: 1MB (in characters)
const MAX_LOG_CONTENT_LENGTH = 1_000_000;

@Injectable()
export class LogService {
  constructor(private prisma: PrismaService) {}

  async saveLog(workspaceId: string, date: Date, content: string) {
    // Validate content length to prevent excessive storage and performance issues
    if (content.length > MAX_LOG_CONTENT_LENGTH) {
      throw new BadRequestException(
        `Log content exceeds maximum allowed size of ${MAX_LOG_CONTENT_LENGTH} characters (current: ${content.length})`,
      );
    }

    return this.prisma.dailyLog.upsert({
      where: {
        workspaceId_date: {
          workspaceId,
          date,
        },
      },
      update: {
        content,
      },
      create: {
        workspaceId,
        date,
        content,
      },
    });
  }

  async getLog(workspaceId: string, date: Date) {
    return this.prisma.dailyLog.findUnique({
      where: {
        workspaceId_date: {
          workspaceId,
          date,
        },
      },
    });
  }

  async getLogs(workspaceId: string, startDate?: Date, endDate?: Date) {
    return this.prisma.dailyLog.findMany({
      where: {
        workspaceId,
        ...(startDate || endDate
          ? {
              date: {
                ...(startDate ? { gte: startDate } : {}),
                ...(endDate ? { lte: endDate } : {}),
              },
            }
          : {}),
      },
      orderBy: {
        date: "desc",
      },
    });
  }

  async extractYesterdayTasks(workspaceId: string, githubUsername: string) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const log = await this.getLog(workspaceId, yesterday);

    if (!log) {
      return [];
    }

    // Parse the content to find unchecked tasks for the user
    const lines = log.content.split("\n");
    const tasks: string[] = [];
    let inUserSection = false;

    for (const line of lines) {
      // Check if this is a user section header (e.g., "### @username")
      if (line.trim().startsWith("###")) {
        const match = line.match(/@(\w+)/);
        if (match && match[1] === githubUsername) {
          inUserSection = true;
        } else if (match) {
          inUserSection = false;
        }
      }

      // If we're in the user's section and find an unchecked task
      if (inUserSection && line.trim().match(/^-\s*\[\s*\]/)) {
        // Extract the task text (remove the checkbox)
        const taskText = line.replace(/^-\s*\[\s*\]/, "").trim();
        if (taskText) {
          tasks.push(taskText);
        }
      }
    }

    return tasks;
  }
}
