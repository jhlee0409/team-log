import { Controller, Get, Query, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LogService } from './log.service';

@Controller('logs')
@UseGuards(AuthGuard('jwt'))
export class LogController {
  constructor(private logService: LogService) {}

  @Get(':workspaceId')
  async getLog(
    @Param('workspaceId') workspaceId: string,
    @Query('date') date?: string,
  ) {
    const queryDate = date ? new Date(date) : new Date();
    queryDate.setHours(0, 0, 0, 0);

    return this.logService.getLog(workspaceId, queryDate);
  }

  @Get(':workspaceId/yesterday-tasks')
  async getYesterdayTasks(
    @Param('workspaceId') workspaceId: string,
    @Req() req,
  ) {
    const tasks = await this.logService.extractYesterdayTasks(
      workspaceId,
      req.user.githubUsername,
    );

    return { tasks };
  }

  @Get(':workspaceId/range')
  async getLogs(
    @Param('workspaceId') workspaceId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);

    return this.logService.getLogs(workspaceId, start, end);
  }
}
