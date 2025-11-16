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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { WorkspaceService } from "./workspace.service";
import { WorkspaceAdminGuard } from "../auth/guards/admin.guard";
import { CreateWorkspaceDto } from "./dto/create-workspace.dto";
import { InviteMemberDto } from "./dto/invite-member.dto";
import { RequestWithUser } from "../auth/interfaces/request-with-user.interface";

@ApiTags("workspaces")
@ApiBearerAuth("JWT-auth")
@Controller("workspaces")
@UseGuards(AuthGuard("jwt"))
export class WorkspaceController {
  constructor(private workspaceService: WorkspaceService) {}

  @ApiOperation({
    summary: "Create a new workspace",
    description: "Creates a new workspace with the authenticated user as owner",
  })
  @ApiResponse({
    status: 201,
    description: "Workspace created successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @Post()
  async create(@Body() dto: CreateWorkspaceDto, @Req() req: RequestWithUser) {
    return this.workspaceService.create(dto.name, req.user.id);
  }

  @ApiOperation({
    summary: "Get user's workspaces",
    description: "Returns all workspaces where the authenticated user is a member",
  })
  @ApiResponse({
    status: 200,
    description: "List of workspaces",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @Get()
  async getUserWorkspaces(@Req() req: RequestWithUser) {
    return this.workspaceService.findUserWorkspaces(req.user.id);
  }

  @ApiOperation({
    summary: "Get workspace by ID",
    description: "Returns a specific workspace with all members",
  })
  @ApiParam({ name: "workspaceId", description: "Workspace UUID" })
  @ApiResponse({
    status: 200,
    description: "Workspace details",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Workspace not found" })
  @Get(":workspaceId")
  async getWorkspace(@Param("workspaceId") workspaceId: string) {
    return this.workspaceService.findById(workspaceId);
  }

  @ApiOperation({
    summary: "Invite member to workspace",
    description:
      "Invites a GitHub user to the workspace (requires admin/owner role)",
  })
  @ApiParam({ name: "workspaceId", description: "Workspace UUID" })
  @ApiResponse({
    status: 201,
    description: "Member invited successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin access required" })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiResponse({ status: 409, description: "Member already exists" })
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

  @ApiOperation({
    summary: "Remove member from workspace",
    description: "Removes a member from the workspace (requires admin/owner role)",
  })
  @ApiParam({ name: "workspaceId", description: "Workspace UUID" })
  @ApiParam({ name: "userId", description: "User UUID to remove" })
  @ApiResponse({
    status: 200,
    description: "Member removed successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin access required" })
  @ApiResponse({ status: 404, description: "Member not found" })
  @ApiResponse({ status: 400, description: "Cannot remove workspace owner" })
  @Delete(":workspaceId/members/:userId")
  @UseGuards(WorkspaceAdminGuard)
  async removeMember(
    @Param("workspaceId") workspaceId: string,
    @Param("userId") userId: string,
  ) {
    return this.workspaceService.removeMember(workspaceId, userId);
  }
}
