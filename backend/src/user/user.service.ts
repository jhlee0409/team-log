import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        workspaces: {
          include: {
            workspace: true,
          },
        },
      },
    });
  }

  async findByGithubId(githubId: string) {
    return this.prisma.user.findUnique({
      where: { githubId },
    });
  }

  async findByGithubUsername(githubUsername: string) {
    return this.prisma.user.findFirst({
      where: { githubUsername },
    });
  }

  async create(data: {
    githubId: string;
    githubUsername: string;
    email?: string;
    avatarUrl?: string;
  }) {
    return this.prisma.user.create({
      data,
    });
  }
}
