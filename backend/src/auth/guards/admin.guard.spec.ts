import { Test, TestingModule } from "@nestjs/testing";
import { WorkspaceAdminGuard } from "./admin.guard";
import { PrismaService } from "../../prisma/prisma.service";
import { ExecutionContext, ForbiddenException } from "@nestjs/common";

describe("WorkspaceAdminGuard", () => {
  let guard: WorkspaceAdminGuard;
  let prismaService: PrismaService;

  const mockPrismaService = {
    workspaceMember: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceAdminGuard,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    guard = module.get<WorkspaceAdminGuard>(WorkspaceAdminGuard);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(guard).toBeDefined();
  });

  const createMockContext = (
    user: any,
    workspaceId: string | null,
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          params: { workspaceId },
          body: {},
        }),
      }),
    } as any;
  };

  describe("canActivate", () => {
    it("should allow access for workspace ADMIN", async () => {
      const mockUser = { id: "user-123", githubUsername: "testuser" };
      const mockMember = {
        userId: "user-123",
        workspaceId: "workspace-123",
        role: "ADMIN",
      };

      const context = createMockContext(mockUser, "workspace-123");

      mockPrismaService.workspaceMember.findUnique.mockResolvedValue(
        mockMember,
      );

      const result = await guard.canActivate(context);

      expect(prismaService.workspaceMember.findUnique).toHaveBeenCalledWith({
        where: {
          userId_workspaceId: {
            userId: "user-123",
            workspaceId: "workspace-123",
          },
        },
      });
      expect(result).toBe(true);
    });

    it("should allow access for workspace OWNER", async () => {
      const mockUser = { id: "user-123", githubUsername: "testuser" };
      const mockMember = {
        userId: "user-123",
        workspaceId: "workspace-123",
        role: "OWNER",
      };

      const context = createMockContext(mockUser, "workspace-123");

      mockPrismaService.workspaceMember.findUnique.mockResolvedValue(
        mockMember,
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it("should deny access for workspace MEMBER", async () => {
      const mockUser = { id: "user-123", githubUsername: "testuser" };
      const mockMember = {
        userId: "user-123",
        workspaceId: "workspace-123",
        role: "MEMBER",
      };

      const context = createMockContext(mockUser, "workspace-123");

      mockPrismaService.workspaceMember.findUnique.mockResolvedValue(
        mockMember,
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        "Only workspace admins can perform this action",
      );
    });

    it("should deny access when user is not a member", async () => {
      const mockUser = { id: "user-123", githubUsername: "testuser" };
      const context = createMockContext(mockUser, "workspace-123");

      mockPrismaService.workspaceMember.findUnique.mockResolvedValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        "Only workspace admins can perform this action",
      );
    });

    it("should deny access when user is not authenticated", async () => {
      const context = createMockContext(null, "workspace-123");

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        "Unauthorized",
      );
    });

    it("should deny access when workspaceId is missing", async () => {
      const mockUser = { id: "user-123", githubUsername: "testuser" };
      const context = createMockContext(mockUser, null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        "Unauthorized",
      );
    });

    it("should get workspaceId from request body if not in params", async () => {
      const mockUser = { id: "user-123", githubUsername: "testuser" };
      const mockMember = {
        userId: "user-123",
        workspaceId: "workspace-456",
        role: "ADMIN",
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: mockUser,
            params: {},
            body: { workspaceId: "workspace-456" },
          }),
        }),
      } as any;

      mockPrismaService.workspaceMember.findUnique.mockResolvedValue(
        mockMember,
      );

      const result = await guard.canActivate(context);

      expect(prismaService.workspaceMember.findUnique).toHaveBeenCalledWith({
        where: {
          userId_workspaceId: {
            userId: "user-123",
            workspaceId: "workspace-456",
          },
        },
      });
      expect(result).toBe(true);
    });

    it("should handle database errors gracefully", async () => {
      const mockUser = { id: "user-123", githubUsername: "testuser" };
      const context = createMockContext(mockUser, "workspace-123");

      mockPrismaService.workspaceMember.findUnique.mockRejectedValue(
        new Error("Database error"),
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        "Database error",
      );
    });

    it("should verify different users correctly", async () => {
      const user1 = { id: "user-111", githubUsername: "user1" };
      const user2 = { id: "user-222", githubUsername: "user2" };

      const member1 = {
        userId: "user-111",
        workspaceId: "workspace-123",
        role: "ADMIN",
      };

      const context1 = createMockContext(user1, "workspace-123");
      const context2 = createMockContext(user2, "workspace-123");

      // User 1 is admin
      mockPrismaService.workspaceMember.findUnique.mockResolvedValueOnce(
        member1,
      );
      const result1 = await guard.canActivate(context1);
      expect(result1).toBe(true);

      // User 2 is not a member
      mockPrismaService.workspaceMember.findUnique.mockResolvedValueOnce(null);
      await expect(guard.canActivate(context2)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
