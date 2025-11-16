import { Test, TestingModule } from "@nestjs/testing";
import { WorkspaceController } from "./workspace.controller";
import { WorkspaceService } from "./workspace.service";
import { CreateWorkspaceDto } from "./dto/create-workspace.dto";
import { InviteMemberDto } from "./dto/invite-member.dto";
import { WorkspaceAdminGuard } from "../auth/guards/admin.guard";
import { CanActivate } from "@nestjs/common";

// Mock guard that always allows access
const mockAdminGuard: CanActivate = {
  canActivate: jest.fn(() => true),
};

describe("WorkspaceController", () => {
  let controller: WorkspaceController;
  let workspaceService: WorkspaceService;

  const mockUser = {
    id: "user-123",
    githubId: "github-123",
    githubUsername: "testuser",
    email: "test@example.com",
    avatarUrl: "https://github.com/avatar.png",
  };

  const mockWorkspace = {
    id: "workspace-123",
    name: "Test Workspace",
    createdAt: new Date("2025-01-01"),
    members: [
      {
        id: "member-123",
        userId: mockUser.id,
        workspaceId: "workspace-123",
        role: "ADMIN" as const,
        joinedAt: new Date("2025-01-01"),
      },
    ],
  };

  const mockWorkspaceService = {
    create: jest.fn(),
    findUserWorkspaces: jest.fn(),
    findById: jest.fn(),
    inviteMemberByGithubUsername: jest.fn(),
    removeMember: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkspaceController],
      providers: [
        {
          provide: WorkspaceService,
          useValue: mockWorkspaceService,
        },
      ],
    })
      .overrideGuard(WorkspaceAdminGuard)
      .useValue(mockAdminGuard)
      .compile();

    controller = module.get<WorkspaceController>(WorkspaceController);
    workspaceService = module.get<WorkspaceService>(WorkspaceService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("POST /workspaces", () => {
    it("should create a new workspace", async () => {
      const dto: CreateWorkspaceDto = {
        name: "My New Workspace",
      };

      const mockRequest = {
        user: mockUser,
      } as any;

      mockWorkspaceService.create.mockResolvedValue(mockWorkspace);

      const result = await controller.create(dto, mockRequest);

      expect(workspaceService.create).toHaveBeenCalledWith(
        dto.name,
        mockUser.id,
      );
      expect(workspaceService.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockWorkspace);
      expect(result.name).toBe("Test Workspace");
    });

    it("should create workspace with different names", async () => {
      const dto: CreateWorkspaceDto = {
        name: "Another Workspace",
      };

      const mockRequest = {
        user: mockUser,
      } as any;

      const anotherWorkspace = {
        ...mockWorkspace,
        id: "workspace-456",
        name: "Another Workspace",
      };

      mockWorkspaceService.create.mockResolvedValue(anotherWorkspace);

      const result = await controller.create(dto, mockRequest);

      expect(result.name).toBe("Another Workspace");
      expect(result.id).toBe("workspace-456");
    });

    it("should create workspace for different users", async () => {
      const dto: CreateWorkspaceDto = {
        name: "User 2 Workspace",
      };

      const differentUser = {
        id: "user-456",
        githubId: "github-456",
        githubUsername: "anotheruser",
        email: "another@example.com",
        avatarUrl: null,
      };

      const mockRequest = {
        user: differentUser,
      } as any;

      mockWorkspaceService.create.mockResolvedValue({
        ...mockWorkspace,
        members: [
          {
            ...mockWorkspace.members[0],
            userId: differentUser.id,
          },
        ],
      });

      const result = await controller.create(dto, mockRequest);

      expect(workspaceService.create).toHaveBeenCalledWith(
        dto.name,
        differentUser.id,
      );
    });
  });

  describe("GET /workspaces", () => {
    it("should return user workspaces", async () => {
      const mockWorkspaces = [
        mockWorkspace,
        {
          ...mockWorkspace,
          id: "workspace-456",
          name: "Second Workspace",
        },
      ];

      const mockRequest = {
        user: mockUser,
      } as any;

      mockWorkspaceService.findUserWorkspaces.mockResolvedValue(
        mockWorkspaces,
      );

      const result = await controller.getUserWorkspaces(mockRequest);

      expect(workspaceService.findUserWorkspaces).toHaveBeenCalledWith(
        mockUser.id,
      );
      expect(workspaceService.findUserWorkspaces).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockWorkspaces);
      expect(result).toHaveLength(2);
    });

    it("should return empty array when user has no workspaces", async () => {
      const mockRequest = {
        user: mockUser,
      } as any;

      mockWorkspaceService.findUserWorkspaces.mockResolvedValue([]);

      const result = await controller.getUserWorkspaces(mockRequest);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it("should return workspaces for different user", async () => {
      const differentUser = {
        id: "user-789",
        githubId: "github-789",
        githubUsername: "thirduser",
        email: "third@example.com",
        avatarUrl: null,
      };

      const mockRequest = {
        user: differentUser,
      } as any;

      const userWorkspaces = [
        {
          ...mockWorkspace,
          id: "workspace-789",
          name: "User 3 Workspace",
        },
      ];

      mockWorkspaceService.findUserWorkspaces.mockResolvedValue(
        userWorkspaces,
      );

      const result = await controller.getUserWorkspaces(mockRequest);

      expect(workspaceService.findUserWorkspaces).toHaveBeenCalledWith(
        differentUser.id,
      );
      expect(result).toHaveLength(1);
    });
  });

  describe("GET /workspaces/:workspaceId", () => {
    it("should return workspace by id", async () => {
      mockWorkspaceService.findById.mockResolvedValue(mockWorkspace);

      const result = await controller.getWorkspace("workspace-123");

      expect(workspaceService.findById).toHaveBeenCalledWith("workspace-123");
      expect(workspaceService.findById).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockWorkspace);
      expect(result.id).toBe("workspace-123");
    });

    it("should handle different workspace ids", async () => {
      const anotherWorkspace = {
        ...mockWorkspace,
        id: "workspace-999",
        name: "Different Workspace",
      };

      mockWorkspaceService.findById.mockResolvedValue(anotherWorkspace);

      const result = await controller.getWorkspace("workspace-999");

      expect(workspaceService.findById).toHaveBeenCalledWith("workspace-999");
      expect(result.id).toBe("workspace-999");
    });
  });

  describe("POST /workspaces/:workspaceId/invite", () => {
    it("should invite member by GitHub username", async () => {
      const dto: InviteMemberDto = {
        githubUsername: "newuser",
      };

      const mockInvitedWorkspace = {
        ...mockWorkspace,
        members: [
          ...mockWorkspace.members,
          {
            id: "member-456",
            userId: "user-456",
            workspaceId: "workspace-123",
            role: "MEMBER" as const,
            joinedAt: new Date("2025-01-02"),
          },
        ],
      };

      mockWorkspaceService.inviteMemberByGithubUsername.mockResolvedValue(
        mockInvitedWorkspace,
      );

      const result = await controller.inviteMember("workspace-123", dto);

      expect(
        workspaceService.inviteMemberByGithubUsername,
      ).toHaveBeenCalledWith("workspace-123", "newuser");
      expect(
        workspaceService.inviteMemberByGithubUsername,
      ).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockInvitedWorkspace);
      expect(result.members).toHaveLength(2);
    });

    it("should invite different users", async () => {
      const dto: InviteMemberDto = {
        githubUsername: "contributor123",
      };

      mockWorkspaceService.inviteMemberByGithubUsername.mockResolvedValue(
        mockWorkspace,
      );

      const result = await controller.inviteMember("workspace-456", dto);

      expect(
        workspaceService.inviteMemberByGithubUsername,
      ).toHaveBeenCalledWith("workspace-456", "contributor123");
    });
  });

  describe("DELETE /workspaces/:workspaceId/members/:userId", () => {
    it("should remove member from workspace", async () => {
      const successMessage = { message: "Member removed successfully" };

      mockWorkspaceService.removeMember.mockResolvedValue(successMessage);

      const result = await controller.removeMember(
        "workspace-123",
        "user-456",
      );

      expect(workspaceService.removeMember).toHaveBeenCalledWith(
        "workspace-123",
        "user-456",
      );
      expect(workspaceService.removeMember).toHaveBeenCalledTimes(1);
      expect(result).toEqual(successMessage);
      expect(result.message).toBe("Member removed successfully");
    });

    it("should remove different members", async () => {
      const successMessage = { message: "Member removed successfully" };

      mockWorkspaceService.removeMember.mockResolvedValue(successMessage);

      const result = await controller.removeMember(
        "workspace-789",
        "user-999",
      );

      expect(workspaceService.removeMember).toHaveBeenCalledWith(
        "workspace-789",
        "user-999",
      );
      expect(result.message).toBe("Member removed successfully");
    });

    it("should handle different workspace and user ids", async () => {
      const successMessage = { message: "Member removed successfully" };

      mockWorkspaceService.removeMember.mockResolvedValue(successMessage);

      const result = await controller.removeMember(
        "workspace-abc",
        "user-xyz",
      );

      expect(workspaceService.removeMember).toHaveBeenCalledWith(
        "workspace-abc",
        "user-xyz",
      );
      expect(result).toEqual(successMessage);
    });
  });

  describe("Error handling", () => {
    it("should propagate service errors on create", async () => {
      const dto: CreateWorkspaceDto = {
        name: "Error Workspace",
      };

      const mockRequest = {
        user: mockUser,
      } as any;

      mockWorkspaceService.create.mockRejectedValue(
        new Error("Database error"),
      );

      await expect(controller.create(dto, mockRequest)).rejects.toThrow(
        "Database error",
      );
    });

    it("should propagate service errors on findById", async () => {
      mockWorkspaceService.findById.mockRejectedValue(
        new Error("Workspace not found"),
      );

      await expect(controller.getWorkspace("invalid-id")).rejects.toThrow(
        "Workspace not found",
      );
    });

    it("should propagate service errors on invite", async () => {
      const dto: InviteMemberDto = {
        githubUsername: "nonexistent",
      };

      mockWorkspaceService.inviteMemberByGithubUsername.mockRejectedValue(
        new Error("User not found"),
      );

      await expect(
        controller.inviteMember("workspace-123", dto),
      ).rejects.toThrow("User not found");
    });
  });
});
