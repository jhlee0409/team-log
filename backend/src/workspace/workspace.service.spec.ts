import { Test, TestingModule } from "@nestjs/testing";
import { WorkspaceService } from "./workspace.service";
import { PrismaService } from "../prisma/prisma.service";
import { UserService } from "../user/user.service";
import { NotFoundException, ForbiddenException } from "@nestjs/common";
import {
  WorkspaceNotFoundException,
  UserNotFoundException,
  MemberAlreadyExistsException,
} from "../common/exceptions/business.exception";

describe("WorkspaceService", () => {
  let service: WorkspaceService;
  let prismaService: PrismaService;

  const mockWorkspace = {
    id: "workspace-1",
    name: "Test Workspace",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: "user-1",
    githubId: "12345",
    githubUsername: "testuser",
    email: "test@example.com",
    avatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    workspace: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    workspaceMember: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockUserService = {
    findById: jest.fn(),
    findByGithubId: jest.fn(),
    findByGithubUsername: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    service = module.get<WorkspaceService>(WorkspaceService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a workspace with creator as admin", async () => {
      const workspaceWithMembers = {
        ...mockWorkspace,
        members: [
          {
            userId: mockUser.id,
            role: "ADMIN",
          },
        ],
      };

      mockPrismaService.workspace.create.mockResolvedValue(
        workspaceWithMembers,
      );

      const result = await service.create("Test Workspace", mockUser.id);

      expect(result).toEqual(workspaceWithMembers);
      expect(mockPrismaService.workspace.create).toHaveBeenCalledWith({
        data: {
          name: "Test Workspace",
          members: {
            create: {
              userId: mockUser.id,
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
    });
  });

  describe("findById", () => {
    it("should return workspace if found", async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue(mockWorkspace);

      const result = await service.findById(mockWorkspace.id);

      expect(result).toEqual(mockWorkspace);
    });

    it("should throw WorkspaceNotFoundException if workspace not found", async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue(null);

      await expect(service.findById("non-existent")).rejects.toThrow(
        WorkspaceNotFoundException,
      );
    });
  });

  describe("findUserWorkspaces", () => {
    it("should return all workspaces for a user", async () => {
      const mockWorkspaces = [mockWorkspace];
      mockPrismaService.workspace.findMany.mockResolvedValue(mockWorkspaces);

      const result = await service.findUserWorkspaces(mockUser.id);

      expect(result).toEqual(mockWorkspaces);
      expect(mockPrismaService.workspace.findMany).toHaveBeenCalledWith({
        where: {
          members: {
            some: {
              userId: mockUser.id,
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
    });
  });

  describe("inviteMemberByGithubUsername", () => {
    it("should invite member successfully", async () => {
      mockUserService.findByGithubUsername.mockResolvedValue(mockUser);
      mockPrismaService.workspaceMember.findUnique.mockResolvedValue(null);
      mockPrismaService.workspaceMember.create.mockResolvedValue({
        workspaceId: mockWorkspace.id,
        userId: mockUser.id,
        role: "MEMBER",
      });

      const result = await service.inviteMemberByGithubUsername(
        mockWorkspace.id,
        mockUser.githubUsername,
      );

      expect(result).toBeDefined();
      expect(mockUserService.findByGithubUsername).toHaveBeenCalledWith(
        mockUser.githubUsername,
      );
      expect(mockPrismaService.workspaceMember.create).toHaveBeenCalled();
    });

    it("should throw UserNotFoundException if user not found", async () => {
      mockUserService.findByGithubUsername.mockResolvedValue(null);

      await expect(
        service.inviteMemberByGithubUsername(mockWorkspace.id, "nonexistent"),
      ).rejects.toThrow(UserNotFoundException);
    });

    it("should throw MemberAlreadyExistsException if user already member", async () => {
      mockUserService.findByGithubUsername.mockResolvedValue(mockUser);
      mockPrismaService.workspaceMember.findUnique.mockResolvedValue({
        workspaceId: mockWorkspace.id,
        userId: mockUser.id,
        role: "MEMBER",
      });

      await expect(
        service.inviteMemberByGithubUsername(
          mockWorkspace.id,
          mockUser.githubUsername,
        ),
      ).rejects.toThrow(MemberAlreadyExistsException);
    });

    it("should handle username with @ prefix", async () => {
      mockUserService.findByGithubUsername.mockResolvedValue(mockUser);
      mockPrismaService.workspaceMember.findUnique.mockResolvedValue(null);
      mockPrismaService.workspaceMember.create.mockResolvedValue({
        workspaceId: mockWorkspace.id,
        userId: mockUser.id,
        role: "MEMBER",
      });

      await service.inviteMemberByGithubUsername(
        mockWorkspace.id,
        "@testuser",
      );

      expect(mockUserService.findByGithubUsername).toHaveBeenCalledWith(
        "testuser",
      );
    });

    it("should create member with MEMBER role by default", async () => {
      mockUserService.findByGithubUsername.mockResolvedValue(mockUser);
      mockPrismaService.workspaceMember.findUnique.mockResolvedValue(null);

      const mockMember = {
        id: "member-1",
        workspaceId: mockWorkspace.id,
        userId: mockUser.id,
        role: "MEMBER",
        joinedAt: new Date(),
        user: mockUser,
      };

      mockPrismaService.workspaceMember.create.mockResolvedValue(mockMember);

      const result = await service.inviteMemberByGithubUsername(
        mockWorkspace.id,
        "testuser",
      );

      expect(result.role).toBe("MEMBER");
      expect(mockPrismaService.workspaceMember.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          workspaceId: mockWorkspace.id,
          role: "MEMBER",
        },
        include: {
          user: true,
        },
      });
    });
  });

  describe("removeMember", () => {
    const mockMember = {
      id: "member-1",
      userId: "user-2",
      workspaceId: mockWorkspace.id,
      role: "MEMBER",
      joinedAt: new Date(),
    };

    const mockOwnerMember = {
      id: "member-owner",
      userId: mockUser.id,
      workspaceId: mockWorkspace.id,
      role: "OWNER",
      joinedAt: new Date(),
    };

    it("should successfully remove a member", async () => {
      mockPrismaService.workspaceMember.findUnique.mockResolvedValue(
        mockMember,
      );
      mockPrismaService.workspaceMember.delete.mockResolvedValue(mockMember);

      const result = await service.removeMember(
        mockWorkspace.id,
        mockMember.userId,
      );

      expect(result).toEqual({ message: "Member removed successfully" });
      expect(mockPrismaService.workspaceMember.findUnique).toHaveBeenCalledWith(
        {
          where: {
            userId_workspaceId: {
              userId: mockMember.userId,
              workspaceId: mockWorkspace.id,
            },
          },
        },
      );
      expect(mockPrismaService.workspaceMember.delete).toHaveBeenCalledWith({
        where: {
          userId_workspaceId: {
            userId: mockMember.userId,
            workspaceId: mockWorkspace.id,
          },
        },
      });
    });

    it("should throw error if member not found", async () => {
      mockPrismaService.workspaceMember.findUnique.mockResolvedValue(null);

      await expect(
        service.removeMember(mockWorkspace.id, "non-existent-user"),
      ).rejects.toThrow("Member not found in this workspace");

      expect(mockPrismaService.workspaceMember.delete).not.toHaveBeenCalled();
    });

    it("should throw error if trying to remove workspace owner", async () => {
      mockPrismaService.workspaceMember.findUnique.mockResolvedValue(
        mockOwnerMember,
      );

      await expect(
        service.removeMember(mockWorkspace.id, mockOwnerMember.userId),
      ).rejects.toThrow(
        "Cannot remove workspace owner. Transfer ownership first.",
      );

      expect(mockPrismaService.workspaceMember.delete).not.toHaveBeenCalled();
    });

    it("should allow removing MEMBER role", async () => {
      const regularMember = {
        ...mockMember,
        role: "MEMBER",
      };

      mockPrismaService.workspaceMember.findUnique.mockResolvedValue(
        regularMember,
      );
      mockPrismaService.workspaceMember.delete.mockResolvedValue(
        regularMember,
      );

      const result = await service.removeMember(
        mockWorkspace.id,
        regularMember.userId,
      );

      expect(result).toEqual({ message: "Member removed successfully" });
      expect(mockPrismaService.workspaceMember.delete).toHaveBeenCalled();
    });

    it("should allow removing ADMIN role", async () => {
      const adminMember = {
        ...mockMember,
        role: "ADMIN",
      };

      mockPrismaService.workspaceMember.findUnique.mockResolvedValue(
        adminMember,
      );
      mockPrismaService.workspaceMember.delete.mockResolvedValue(adminMember);

      const result = await service.removeMember(
        mockWorkspace.id,
        adminMember.userId,
      );

      expect(result).toEqual({ message: "Member removed successfully" });
      expect(mockPrismaService.workspaceMember.delete).toHaveBeenCalled();
    });

    it("should handle different workspace IDs correctly", async () => {
      const workspace2Member = {
        ...mockMember,
        workspaceId: "workspace-2",
      };

      mockPrismaService.workspaceMember.findUnique.mockResolvedValue(
        workspace2Member,
      );
      mockPrismaService.workspaceMember.delete.mockResolvedValue(
        workspace2Member,
      );

      await service.removeMember("workspace-2", workspace2Member.userId);

      expect(mockPrismaService.workspaceMember.findUnique).toHaveBeenCalledWith(
        {
          where: {
            userId_workspaceId: {
              userId: workspace2Member.userId,
              workspaceId: "workspace-2",
            },
          },
        },
      );
    });

    it("should throw BusinessException with correct error code for member not found", async () => {
      mockPrismaService.workspaceMember.findUnique.mockResolvedValue(null);

      try {
        await service.removeMember(mockWorkspace.id, "non-existent-user");
        fail("Should have thrown an error");
      } catch (error) {
        expect(error.code).toBe("MEMBER_NOT_FOUND");
        expect(error.getStatus()).toBe(404);
      }
    });

    it("should throw BusinessException with correct error code for owner removal", async () => {
      mockPrismaService.workspaceMember.findUnique.mockResolvedValue(
        mockOwnerMember,
      );

      try {
        await service.removeMember(mockWorkspace.id, mockOwnerMember.userId);
        fail("Should have thrown an error");
      } catch (error) {
        expect(error.code).toBe("CANNOT_REMOVE_OWNER");
        expect(error.getStatus()).toBe(400);
      }
    });
  });

  describe("Integration scenarios", () => {
    it("should create workspace and then find it", async () => {
      const workspaceWithMembers = {
        ...mockWorkspace,
        members: [
          {
            userId: mockUser.id,
            role: "OWNER",
            user: mockUser,
          },
        ],
      };

      mockPrismaService.workspace.create.mockResolvedValue(
        workspaceWithMembers,
      );
      mockPrismaService.workspace.findUnique.mockResolvedValue(
        workspaceWithMembers,
      );

      const created = await service.create("Test Workspace", mockUser.id);
      const found = await service.findById(created.id);

      expect(found.id).toBe(created.id);
      expect(found.name).toBe(created.name);
    });

    it("should create workspace, invite member, then remove member", async () => {
      const workspaceWithMembers = {
        ...mockWorkspace,
        members: [
          {
            userId: mockUser.id,
            role: "OWNER",
            user: mockUser,
          },
        ],
      };

      const newMember = {
        id: "member-new",
        userId: "user-2",
        workspaceId: mockWorkspace.id,
        role: "MEMBER",
        joinedAt: new Date(),
        user: {
          id: "user-2",
          githubUsername: "newuser",
          githubId: "67890",
          email: "new@example.com",
          avatarUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      // Create workspace
      mockPrismaService.workspace.create.mockResolvedValue(
        workspaceWithMembers,
      );
      const workspace = await service.create("Test Workspace", mockUser.id);

      // Invite member
      mockUserService.findByGithubUsername.mockResolvedValue(newMember.user);
      mockPrismaService.workspaceMember.findUnique.mockResolvedValue(null);
      mockPrismaService.workspaceMember.create.mockResolvedValue(newMember);
      const invited = await service.inviteMemberByGithubUsername(
        workspace.id,
        "newuser",
      );

      // Remove member
      mockPrismaService.workspaceMember.findUnique.mockResolvedValue(newMember);
      mockPrismaService.workspaceMember.delete.mockResolvedValue(newMember);
      const result = await service.removeMember(workspace.id, invited.userId);

      expect(result).toEqual({ message: "Member removed successfully" });
    });
  });
});
