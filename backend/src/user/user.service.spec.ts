import { Test, TestingModule } from "@nestjs/testing";
import { UserService } from "./user.service";
import { PrismaService } from "../prisma/prisma.service";

describe("UserService", () => {
  let service: UserService;
  let prismaService: PrismaService;

  const mockUser = {
    id: "user-123",
    githubId: "github-123",
    githubUsername: "testuser",
    email: "test@example.com",
    avatarUrl: "https://github.com/avatar.png",
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  };

  const mockUserWithWorkspaces = {
    ...mockUser,
    workspaces: [
      {
        id: "member-1",
        userId: "user-123",
        workspaceId: "workspace-1",
        role: "ADMIN",
        joinedAt: new Date("2025-01-01"),
        workspace: {
          id: "workspace-1",
          name: "Test Workspace",
          createdAt: new Date("2025-01-01"),
          updatedAt: new Date("2025-01-01"),
        },
      },
    ],
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findById", () => {
    it("should find user by ID with workspaces", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(
        mockUserWithWorkspaces,
      );

      const result = await service.findById("user-123");

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-123" },
        include: {
          workspaces: {
            include: {
              workspace: true,
            },
          },
        },
      });
      expect(prismaService.user.findUnique).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockUserWithWorkspaces);
      expect(result.workspaces).toHaveLength(1);
    });

    it("should return null if user not found", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findById("non-existent");

      expect(result).toBeNull();
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: "non-existent" },
        include: {
          workspaces: {
            include: {
              workspace: true,
            },
          },
        },
      });
    });

    it("should find user with multiple workspaces", async () => {
      const userWithMultipleWorkspaces = {
        ...mockUser,
        workspaces: [
          {
            id: "member-1",
            userId: "user-123",
            workspaceId: "workspace-1",
            role: "ADMIN",
            joinedAt: new Date("2025-01-01"),
            workspace: {
              id: "workspace-1",
              name: "Workspace 1",
              createdAt: new Date("2025-01-01"),
              updatedAt: new Date("2025-01-01"),
            },
          },
          {
            id: "member-2",
            userId: "user-123",
            workspaceId: "workspace-2",
            role: "MEMBER",
            joinedAt: new Date("2025-01-02"),
            workspace: {
              id: "workspace-2",
              name: "Workspace 2",
              createdAt: new Date("2025-01-02"),
              updatedAt: new Date("2025-01-02"),
            },
          },
        ],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(
        userWithMultipleWorkspaces,
      );

      const result = await service.findById("user-123");

      expect(result.workspaces).toHaveLength(2);
      expect(result.workspaces[0].role).toBe("ADMIN");
      expect(result.workspaces[1].role).toBe("MEMBER");
    });

    it("should find user with no workspaces", async () => {
      const userWithNoWorkspaces = {
        ...mockUser,
        workspaces: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(userWithNoWorkspaces);

      const result = await service.findById("user-456");

      expect(result.workspaces).toEqual([]);
      expect(result.workspaces).toHaveLength(0);
    });

    it("should handle different user IDs", async () => {
      const differentUser = {
        id: "user-456",
        githubId: "github-456",
        githubUsername: "anotheruser",
        email: "another@example.com",
        avatarUrl: null,
        createdAt: new Date("2025-01-10"),
        updatedAt: new Date("2025-01-10"),
        workspaces: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(differentUser);

      const result = await service.findById("user-456");

      expect(result.id).toBe("user-456");
      expect(result.githubUsername).toBe("anotheruser");
      expect(result.avatarUrl).toBeNull();
    });
  });

  describe("findByGithubId", () => {
    it("should find user by GitHub ID", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByGithubId("github-123");

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { githubId: "github-123" },
      });
      expect(prismaService.user.findUnique).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockUser);
      expect(result.githubId).toBe("github-123");
    });

    it("should return null if GitHub ID not found", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findByGithubId("non-existent-github-id");

      expect(result).toBeNull();
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { githubId: "non-existent-github-id" },
      });
    });

    it("should handle different GitHub IDs", async () => {
      const users = [
        { ...mockUser, id: "user-1", githubId: "github-1" },
        { ...mockUser, id: "user-2", githubId: "github-2" },
        { ...mockUser, id: "user-3", githubId: "github-3" },
      ];

      for (const user of users) {
        mockPrismaService.user.findUnique.mockResolvedValueOnce(user);
        const result = await service.findByGithubId(user.githubId);
        expect(result.githubId).toBe(user.githubId);
      }

      expect(prismaService.user.findUnique).toHaveBeenCalledTimes(3);
    });

    it("should find user without email or avatar", async () => {
      const userWithoutOptionalFields = {
        ...mockUser,
        email: null,
        avatarUrl: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(
        userWithoutOptionalFields,
      );

      const result = await service.findByGithubId("github-123");

      expect(result.email).toBeNull();
      expect(result.avatarUrl).toBeNull();
      expect(result.githubId).toBe("github-123");
    });
  });

  describe("findByGithubUsername", () => {
    it("should find user by GitHub username", async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.findByGithubUsername("testuser");

      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: { githubUsername: "testuser" },
      });
      expect(prismaService.user.findFirst).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockUser);
      expect(result.githubUsername).toBe("testuser");
    });

    it("should return null if username not found", async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      const result = await service.findByGithubUsername("nonexistent");

      expect(result).toBeNull();
      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: { githubUsername: "nonexistent" },
      });
    });

    it("should handle different usernames", async () => {
      const usernames = ["alice", "bob", "charlie"];

      for (const username of usernames) {
        const user = { ...mockUser, githubUsername: username };
        mockPrismaService.user.findFirst.mockResolvedValueOnce(user);

        const result = await service.findByGithubUsername(username);

        expect(result.githubUsername).toBe(username);
      }

      expect(prismaService.user.findFirst).toHaveBeenCalledTimes(3);
    });

    it("should handle case-sensitive username search", async () => {
      // Prisma findFirst is case-sensitive by default
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.findByGithubUsername("testuser");

      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: { githubUsername: "testuser" },
      });
      expect(result.githubUsername).toBe("testuser");
    });
  });

  describe("create", () => {
    it("should create user with all fields", async () => {
      const createData = {
        githubId: "github-new",
        githubUsername: "newuser",
        email: "new@example.com",
        avatarUrl: "https://github.com/newavatar.png",
      };

      const createdUser = {
        id: "user-new",
        ...createData,
        createdAt: new Date("2025-01-15"),
        updatedAt: new Date("2025-01-15"),
      };

      mockPrismaService.user.create.mockResolvedValue(createdUser);

      const result = await service.create(createData);

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: createData,
      });
      expect(prismaService.user.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual(createdUser);
      expect(result.githubUsername).toBe("newuser");
      expect(result.email).toBe("new@example.com");
    });

    it("should create user without optional email", async () => {
      const createData = {
        githubId: "github-noemail",
        githubUsername: "noemailuser",
        avatarUrl: "https://github.com/avatar.png",
      };

      const createdUser = {
        id: "user-noemail",
        ...createData,
        email: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.create.mockResolvedValue(createdUser);

      const result = await service.create(createData);

      expect(result.email).toBeNull();
      expect(result.githubUsername).toBe("noemailuser");
    });

    it("should create user without optional avatarUrl", async () => {
      const createData = {
        githubId: "github-noavatar",
        githubUsername: "noavataruser",
        email: "noavatar@example.com",
      };

      const createdUser = {
        id: "user-noavatar",
        ...createData,
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.create.mockResolvedValue(createdUser);

      const result = await service.create(createData);

      expect(result.avatarUrl).toBeNull();
      expect(result.email).toBe("noavatar@example.com");
    });

    it("should create user with only required fields", async () => {
      const createData = {
        githubId: "github-minimal",
        githubUsername: "minimaluser",
      };

      const createdUser = {
        id: "user-minimal",
        ...createData,
        email: null,
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.create.mockResolvedValue(createdUser);

      const result = await service.create(createData);

      expect(result.githubUsername).toBe("minimaluser");
      expect(result.email).toBeNull();
      expect(result.avatarUrl).toBeNull();
    });

    it("should handle database errors", async () => {
      const createData = {
        githubId: "github-error",
        githubUsername: "erroruser",
      };

      mockPrismaService.user.create.mockRejectedValue(
        new Error("Database error"),
      );

      await expect(service.create(createData)).rejects.toThrow(
        "Database error",
      );

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: createData,
      });
    });

    it("should handle duplicate GitHub ID error", async () => {
      const createData = {
        githubId: "github-duplicate",
        githubUsername: "duplicateuser",
      };

      mockPrismaService.user.create.mockRejectedValue(
        new Error("Unique constraint failed on the fields: (`githubId`)"),
      );

      await expect(service.create(createData)).rejects.toThrow(
        "Unique constraint",
      );
    });
  });

  describe("Integration scenarios", () => {
    it("should find user by ID after creation", async () => {
      const createData = {
        githubId: "github-integration",
        githubUsername: "integrationuser",
        email: "integration@example.com",
      };

      const createdUser = {
        id: "user-integration",
        ...createData,
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Create user
      mockPrismaService.user.create.mockResolvedValue(createdUser);
      const created = await service.create(createData);

      // Find by ID
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...createdUser,
        workspaces: [],
      });
      const found = await service.findById(created.id);

      expect(found.id).toBe(created.id);
      expect(found.githubUsername).toBe(created.githubUsername);
    });

    it("should find user by GitHub ID or username", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      const byGithubId = await service.findByGithubId("github-123");
      const byUsername = await service.findByGithubUsername("testuser");

      expect(byGithubId.id).toBe(byUsername.id);
      expect(byGithubId.githubUsername).toBe(byUsername.githubUsername);
    });
  });
});
