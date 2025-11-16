import { Controller, Get, Query, Param, UseGuards, Req, BadRequestException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Throttle } from "@nestjs/throttler";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { LogService } from "./log.service";
import { GetLogDto } from "./dto/get-log.dto";
import { GetLogsRangeDto } from "./dto/get-logs-range.dto";
import { RequestWithUser } from "../auth/interfaces/request-with-user.interface";
import { WorkspaceMemberGuard } from "../auth/guards/workspace-member.guard";

@ApiTags("logs")
@ApiBearerAuth("JWT-auth")
@Controller("logs")
@UseGuards(AuthGuard("jwt"))
export class LogController {
  constructor(private logService: LogService) {}

  @ApiOperation({
    summary: "Get daily log",
    description: "Returns the daily log for a specific date (defaults to today)",
  })
  @ApiParam({ name: "workspaceId", description: "Workspace UUID" })
  @ApiResponse({
    status: 200,
    description: "Daily log returned (null if not found)",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Not a workspace member" })
  @UseGuards(WorkspaceMemberGuard)
  @Get(":workspaceId")
  async getLog(
    @Param("workspaceId") workspaceId: string,
    @Query() query: GetLogDto,
  ) {
    const queryDate = query.date ? new Date(query.date) : new Date();
    queryDate.setHours(0, 0, 0, 0);

    return this.logService.getLog(workspaceId, queryDate);
  }

  @ApiOperation({
    summary: "Get yesterday's uncompleted tasks",
    description:
      "Extracts unchecked tasks from yesterday's log for the current user",
  })
  @ApiParam({ name: "workspaceId", description: "Workspace UUID" })
  @ApiResponse({
    status: 200,
    description: "List of uncompleted tasks",
    schema: {
      example: {
        tasks: [
          "Implement user authentication",
          "Write unit tests for workspace service",
        ],
      },
    },
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Not a workspace member" })
  @UseGuards(WorkspaceMemberGuard)
  @Get(":workspaceId/yesterday-tasks")
  async getYesterdayTasks(
    @Param("workspaceId") workspaceId: string,
    @Req() req: RequestWithUser,
  ) {
    const tasks = await this.logService.extractYesterdayTasks(
      workspaceId,
      req.user.githubUsername,
    );

    return { tasks };
  }

  @ApiOperation({
    summary: "Get logs in date range",
    description: "Returns all logs within the specified date range (max 1 year)",
  })
  @ApiParam({ name: "workspaceId", description: "Workspace UUID" })
  @ApiResponse({
    status: 200,
    description: "List of logs in the date range",
  })
  @ApiResponse({ status: 400, description: "Bad Request - Date range exceeds 1 year" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Not a workspace member" })
  @ApiResponse({ status: 429, description: "Too Many Requests - Rate limit exceeded" })
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // Stricter limit: 10 requests per minute
  @UseGuards(WorkspaceMemberGuard)
  @Get(":workspaceId/range")
  async getLogs(
    @Param("workspaceId") workspaceId: string,
    @Query() query: GetLogsRangeDto,
  ) {
    const start = query.startDate ? new Date(query.startDate) : undefined;
    const end = query.endDate ? new Date(query.endDate) : undefined;

    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);

    // Validate date range size to prevent database DoS
    if (start && end) {
      const daysDiff = Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 365) {
        throw new BadRequestException(
          "Date range cannot exceed 1 year (365 days)",
        );
      }
    }

    return this.logService.getLogs(workspaceId, start, end);
  }
}
