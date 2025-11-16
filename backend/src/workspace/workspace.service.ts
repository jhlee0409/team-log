import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UserService } from "../user/user.service";
import {
  WorkspaceNotFoundException,
  UserNotFoundException,
  MemberAlreadyExistsException,
  BusinessException,
} from "../common/exceptions/business.exception";

@Injectable()
export class WorkspaceService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
  ) {}

  async create(name: string, ownerId: string) {
    const workspace = await this.prisma.workspace.create({
      data: {
        name,
        members: {
          create: {
            userId: ownerId,
            role: "OWNER",
          },
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    return workspace;
  }

  async findById(id: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!workspace) {
      throw new WorkspaceNotFoundException(id);
    }

    return workspace;
  }

  async findUserWorkspaces(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const total = await this.prisma.workspace.count({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
    });

    // Get paginated results
    const data = await this.prisma.workspace.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async inviteMemberByGithubUsername(
    workspaceId: string,
    githubUsername: string,
  ) {
    // Remove @ if present
    const cleanUsername = githubUsername.replace(/^@/, "");

    // Find user by GitHub username
    const user = await this.userService.findByGithubUsername(cleanUsername);

    if (!user) {
      throw new UserNotFoundException(cleanUsername);
    }

    // Check if user is already a member
    const existingMember = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: user.id,
          workspaceId,
        },
      },
    });

    if (existingMember) {
      throw new MemberAlreadyExistsException(cleanUsername, workspaceId);
    }

    // Add user to workspace
    const member = await this.prisma.workspaceMember.create({
      data: {
        userId: user.id,
        workspaceId,
        role: "MEMBER",
      },
      include: {
        user: true,
      },
    });

    return member;
  }

  async removeMember(workspaceId: string, userId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    if (!member) {
      throw new BusinessException(
        "MEMBER_NOT_FOUND",
        "Member not found in this workspace",
        404,
      );
    }

    if (member.role === "OWNER") {
      throw new BusinessException(
        "CANNOT_REMOVE_OWNER",
        "Cannot remove workspace owner. Transfer ownership first.",
        400,
      );
    }

    await this.prisma.workspaceMember.delete({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    return { message: "Member removed successfully" };
  }
}
