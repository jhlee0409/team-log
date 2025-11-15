import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';

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
            role: 'OWNER',
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
      throw new NotFoundException('Workspace not found');
    }

    return workspace;
  }

  async findUserWorkspaces(userId: string) {
    return this.prisma.workspace.findMany({
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
    });
  }

  async inviteMemberByGithubUsername(
    workspaceId: string,
    githubUsername: string,
  ) {
    // Remove @ if present
    const cleanUsername = githubUsername.replace(/^@/, '');

    // Find user by GitHub username
    const user = await this.userService.findByGithubUsername(cleanUsername);

    if (!user) {
      throw new NotFoundException(
        `User with GitHub username @${cleanUsername} not found. They need to sign in to TeamLog first.`,
      );
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
      throw new BadRequestException('User is already a member of this workspace');
    }

    // Add user to workspace
    const member = await this.prisma.workspaceMember.create({
      data: {
        userId: user.id,
        workspaceId,
        role: 'MEMBER',
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
      throw new NotFoundException('Member not found');
    }

    if (member.role === 'OWNER') {
      throw new BadRequestException('Cannot remove workspace owner');
    }

    await this.prisma.workspaceMember.delete({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    return { message: 'Member removed successfully' };
  }
}
