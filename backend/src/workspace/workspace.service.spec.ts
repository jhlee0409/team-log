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
  });
});
