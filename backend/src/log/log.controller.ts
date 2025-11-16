import { Controller, Get, Query, Param, UseGuards, Req } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
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
    description: "Returns all logs within the specified date range",
  })
  @ApiParam({ name: "workspaceId", description: "Workspace UUID" })
  @ApiResponse({
    status: 200,
    description: "List of logs in the date range",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @Get(":workspaceId/range")
  async getLogs(
    @Param("workspaceId") workspaceId: string,
    @Query() query: GetLogsRangeDto,
  ) {
    const start = query.startDate ? new Date(query.startDate) : undefined;
    const end = query.endDate ? new Date(query.endDate) : undefined;

    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);

    return this.logService.getLogs(workspaceId, start, end);
  }
}
