import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WorkspaceService } from './workspace.service';
import { WorkspaceAdminGuard } from '../auth/guards/admin.guard';

@Controller('workspaces')
@UseGuards(AuthGuard('jwt'))
export class WorkspaceController {
  constructor(private workspaceService: WorkspaceService) {}

  @Post()
  async create(@Body('name') name: string, @Req() req) {
    return this.workspaceService.create(name, req.user.id);
  }

  @Get()
  async getUserWorkspaces(@Req() req) {
    return this.workspaceService.findUserWorkspaces(req.user.id);
  }

  @Get(':workspaceId')
  async getWorkspace(@Param('workspaceId') workspaceId: string) {
    return this.workspaceService.findById(workspaceId);
  }

  @Post(':workspaceId/invite')
  @UseGuards(WorkspaceAdminGuard)
  async inviteMember(
    @Param('workspaceId') workspaceId: string,
    @Body('githubUsername') githubUsername: string,
  ) {
    return this.workspaceService.inviteMemberByGithubUsername(
      workspaceId,
      githubUsername,
    );
  }

  @Delete(':workspaceId/members/:userId')
  @UseGuards(WorkspaceAdminGuard)
  async removeMember(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') userId: string,
  ) {
    return this.workspaceService.removeMember(workspaceId, userId);
  }
}
