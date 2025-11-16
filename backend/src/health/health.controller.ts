import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { HealthService } from "./health.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @ApiOperation({
    summary: "Health check endpoint",
    description:
      "Returns system health status including database and Yjs WebSocket server",
  })
  @ApiResponse({
    status: 200,
    description: "Health check result",
    schema: {
      example: {
        status: "healthy",
        timestamp: "2025-11-16T10:00:00.000Z",
        uptime: 3600,
        checks: {
          database: {
            status: "up",
            responseTime: 10,
          },
          yjsWebSocket: {
            status: "up",
          },
        },
      },
    },
  })
  @Get()
  async check() {
    return this.healthService.check();
  }
}
