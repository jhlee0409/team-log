import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { YjsService } from "../yjs/yjs.service";

export interface HealthCheckResult {
  status: "healthy" | "unhealthy";
  timestamp: string;
  uptime: number;
  checks: {
    database: {
      status: "up" | "down";
      responseTime?: number;
      error?: string;
    };
    yjsWebSocket: {
      status: "up" | "down";
      error?: string;
    };
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly yjsService: YjsService,
  ) {}

  async check(): Promise<HealthCheckResult> {
    const checks = {
      database: await this.checkDatabase(),
      yjsWebSocket: this.checkYjsWebSocket(),
    };

    const allHealthy =
      checks.database.status === "up" && checks.yjsWebSocket.status === "up";

    return {
      status: allHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000), // seconds
      checks,
    };
  }

  private async checkDatabase(): Promise<{
    status: "up" | "down";
    responseTime?: number;
    error?: string;
  }> {
    const start = Date.now();

    try {
      // Simple query to check database connectivity
      await this.prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - start;

      return {
        status: "up",
        responseTime,
      };
    } catch (error) {
      this.logger.error("Database health check failed", error);
      return {
        status: "down",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private checkYjsWebSocket(): {
    status: "up" | "down";
    error?: string;
  } {
    try {
      // Check if YjsService WebSocket server is accessible
      const isRunning = this.yjsService.isWebSocketServerRunning();

      return {
        status: isRunning ? "up" : "down",
        error: isRunning ? undefined : "WebSocket server not initialized",
      };
    } catch (error) {
      this.logger.error("Yjs WebSocket health check failed", error);
      return {
        status: "down",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
