import { Controller, Get, Query, Param, UseGuards, Req } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { LogService } from "./log.service";
import { GetLogDto } from "./dto/get-log.dto";
import { GetLogsRangeDto } from "./dto/get-logs-range.dto";
import { RequestWithUser } from "../auth/interfaces/request-with-user.interface";

@Controller("logs")
@UseGuards(AuthGuard("jwt"))
export class LogController {
  constructor(private logService: LogService) {}

  @Get(":workspaceId")
  async getLog(
    @Param("workspaceId") workspaceId: string,
    @Query() query: GetLogDto,
  ) {
    const queryDate = query.date ? new Date(query.date) : new Date();
    queryDate.setHours(0, 0, 0, 0);

    return this.logService.getLog(workspaceId, queryDate);
  }

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
