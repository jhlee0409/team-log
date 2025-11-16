import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { WorkspaceService } from "./workspace.service";
import { WorkspaceAdminGuard } from "../auth/guards/admin.guard";
import { CreateWorkspaceDto } from "./dto/create-workspace.dto";
import { InviteMemberDto } from "./dto/invite-member.dto";
import { RequestWithUser } from "../auth/interfaces/request-with-user.interface";

@Controller("workspaces")
@UseGuards(AuthGuard("jwt"))
export class WorkspaceController {
  constructor(private workspaceService: WorkspaceService) {}

  @Post()
  async create(@Body() dto: CreateWorkspaceDto, @Req() req: RequestWithUser) {
    return this.workspaceService.create(dto.name, req.user.id);
  }

  @Get()
  async getUserWorkspaces(@Req() req: RequestWithUser) {
    return this.workspaceService.findUserWorkspaces(req.user.id);
  }

  @Get(":workspaceId")
  async getWorkspace(@Param("workspaceId") workspaceId: string) {
    return this.workspaceService.findById(workspaceId);
  }

  @Post(":workspaceId/invite")
  @UseGuards(WorkspaceAdminGuard)
  async inviteMember(
    @Param("workspaceId") workspaceId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.workspaceService.inviteMemberByGithubUsername(
      workspaceId,
      dto.githubUsername,
    );
  }

  @Delete(":workspaceId/members/:userId")
  @UseGuards(WorkspaceAdminGuard)
  async removeMember(
    @Param("workspaceId") workspaceId: string,
    @Param("userId") userId: string,
  ) {
    return this.workspaceService.removeMember(workspaceId, userId);
  }
}
