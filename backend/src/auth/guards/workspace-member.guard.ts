import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Guard to verify that the authenticated user is a member of the requested workspace.
 * Checks for ANY role (OWNER, ADMIN, or MEMBER).
 * For admin-only operations, use WorkspaceAdminGuard instead.
 */
@Injectable()
export class WorkspaceMemberGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const workspaceId = request.params.workspaceId || request.body.workspaceId;

    if (!user || !workspaceId) {
      throw new ForbiddenException("Unauthorized");
    }

    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: user.id,
          workspaceId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException("You are not a member of this workspace");
    }

    return true;
  }
}
