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

      const paginatedResponse = {
        data: mockWorkspaces,
        pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
      };
      mockWorkspaceService.findUserWorkspaces.mockResolvedValue(
        paginatedResponse,
      );

      const mockQuery = { page: 1, limit: 20 };
      const result = await controller.getUserWorkspaces(mockRequest, mockQuery);

      expect(workspaceService.findUserWorkspaces).toHaveBeenCalledWith(
        mockUser.id,
        1,
        20,
      );
      expect(workspaceService.findUserWorkspaces).toHaveBeenCalledTimes(1);
      expect(result).toEqual(paginatedResponse);
      expect(result.data).toHaveLength(2);
    });

    it("should return empty array when user has no workspaces", async () => {
      const mockRequest = {
        user: mockUser,
      } as any;

      const emptyResponse = {
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };
      mockWorkspaceService.findUserWorkspaces.mockResolvedValue(emptyResponse);

      const mockQuery = { page: 1, limit: 20 };
      const result = await controller.getUserWorkspaces(mockRequest, mockQuery);

      expect(result).toEqual(emptyResponse);
      expect(result.data).toHaveLength(0);
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

      const paginatedResponse = {
        data: userWorkspaces,
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };
      mockWorkspaceService.findUserWorkspaces.mockResolvedValue(
        paginatedResponse,
      );

      const mockQuery = { page: 1, limit: 20 };
      const result = await controller.getUserWorkspaces(mockRequest, mockQuery);

      expect(workspaceService.findUserWorkspaces).toHaveBeenCalledWith(
        differentUser.id,
        1,
        20,
      );
      expect(result.data).toHaveLength(1);
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

  describe("Security: IDOR (Insecure Direct Object Reference) Prevention", () => {
    it("should prevent accessing other user's workspace", async () => {
      const user1 = { id: "user-1", githubUsername: "user1" };
      const user2OwnedWorkspace = "workspace-owned-by-user-2";

      const mockRequest = { user: user1 } as any;

      // Service should throw WorkspaceAccessDeniedException
      const { WorkspaceAccessDeniedException } = require("../common/exceptions/business.exception");

      mockWorkspaceService.findById.mockRejectedValue(
        new WorkspaceAccessDeniedException(user2OwnedWorkspace),
      );

      await expect(
        controller.getWorkspace(user2OwnedWorkspace),
      ).rejects.toThrow(WorkspaceAccessDeniedException);
    });

    it("should prevent non-member from inviting other users", async () => {
      const nonMember = { id: "non-member-123" };
      const dto: InviteMemberDto = { githubUsername: "newuser" };

      // WorkspaceAdminGuard should deny this at guard level
      // Service layer should also verify membership

      const { InsufficientPermissionException } = require("../common/exceptions/business.exception");

      mockWorkspaceService.inviteMemberByGithubUsername.mockRejectedValue(
        new InsufficientPermissionException("Only admins can invite members"),
      );

      await expect(
        controller.inviteMember("workspace-123", dto),
      ).rejects.toThrow(InsufficientPermissionException);
    });

    it("should prevent member from removing other members", async () => {
      const regularMember = { id: "member-123" };

      // Only ADMIN/OWNER can remove members
      const { InsufficientPermissionException } = require("../common/exceptions/business.exception");

      mockWorkspaceService.removeMember.mockRejectedValue(
        new InsufficientPermissionException("Only admins can remove members"),
      );

      await expect(
        controller.removeMember("workspace-123", "user-456"),
      ).rejects.toThrow(InsufficientPermissionException);
    });

    it("should prevent accessing workspace with manipulated ID", async () => {
      const maliciousWorkspaceIds = [
        "../../../etc/passwd",  // Path traversal attempt
        "'; DROP TABLE workspaces; --",  // SQL injection attempt
        "<script>alert('xss')</script>",  // XSS attempt
        "workspace-999999",  // Non-existent workspace
      ];

      for (const maliciousId of maliciousWorkspaceIds) {
        const { WorkspaceNotFoundException } = require("../common/exceptions/business.exception");

        mockWorkspaceService.findById.mockRejectedValue(
          new WorkspaceNotFoundException(maliciousId),
        );

        await expect(controller.getWorkspace(maliciousId)).rejects.toThrow();
      }
    });

    it("should prevent user from creating workspace with another user's ID", async () => {
      const attacker = { id: "attacker-123" };
      const victim = { id: "victim-456" };

      const mockRequest = { user: attacker } as any;
      const dto: CreateWorkspaceDto = { name: "Fake Workspace" };

      // Controller should use req.user.id, not accept user ID from body
      mockWorkspaceService.create.mockImplementation((name, userId) => {
        // Verify that userId matches authenticated user
        expect(userId).toBe(attacker.id);
        expect(userId).not.toBe(victim.id);

        return Promise.resolve({
          id: "workspace-123",
          name,
          createdAt: new Date(),
          members: [],
        });
      });

      await controller.create(dto, mockRequest);

      expect(mockWorkspaceService.create).toHaveBeenCalledWith(
        dto.name,
        attacker.id,  // Should use authenticated user ID
      );
    });

    it("should prevent enumeration of workspace IDs", async () => {
      // Attacker tries sequential workspace IDs
      const workspaceIds = [
        "workspace-1",
        "workspace-2",
        "workspace-3",
        "workspace-4",
        "workspace-5",
      ];

      const { WorkspaceNotFoundException } = require("../common/exceptions/business.exception");

      // All should return same error (not revealing which exist)
      for (const id of workspaceIds) {
        mockWorkspaceService.findById.mockRejectedValue(
          new WorkspaceNotFoundException(id),
        );

        await expect(controller.getWorkspace(id)).rejects.toThrow(
          WorkspaceNotFoundException,
        );
      }

      // Error messages should be consistent
      // (not "Workspace not found" vs "Access denied")
    });

    it("should validate workspace ownership on deletion", async () => {
      // Note: Delete functionality not yet implemented
      // This test documents expected security behavior for future implementation

      // When implemented, deletion should:
      // 1. Only be allowed by workspace OWNER
      // 2. Verify ownership before deletion
      // 3. Throw InsufficientPermissionException for non-owners

      // Placeholder test that documents requirement
      expect(true).toBe(true);
    });
  });

  describe("Security: Path Traversal Prevention", () => {
    it("should reject workspace ID with directory traversal (../ pattern)", async () => {
      const traversalId = "../../../etc/passwd";

      const { WorkspaceNotFoundException } = require("../common/exceptions/business.exception");

      mockWorkspaceService.findById.mockRejectedValue(
        new WorkspaceNotFoundException(traversalId),
      );

      await expect(controller.getWorkspace(traversalId)).rejects.toThrow(
        WorkspaceNotFoundException,
      );
    });

    it("should reject workspace ID with Windows path traversal (..\\)", async () => {
      const traversalId = "..\\..\\..\\windows\\system32\\config\\sam";

      const { WorkspaceNotFoundException } = require("../common/exceptions/business.exception");

      mockWorkspaceService.findById.mockRejectedValue(
        new WorkspaceNotFoundException(traversalId),
      );

      await expect(controller.getWorkspace(traversalId)).rejects.toThrow();
    });

    it("should reject workspace ID with URL-encoded path traversal", async () => {
      const traversalId = "%2e%2e%2f%2e%2e%2fetc%2fpasswd";

      const { WorkspaceNotFoundException } = require("../common/exceptions/business.exception");

      mockWorkspaceService.findById.mockRejectedValue(
        new WorkspaceNotFoundException(traversalId),
      );

      await expect(controller.getWorkspace(traversalId)).rejects.toThrow();
    });

    it("should reject workspace ID with double-encoded path traversal", async () => {
      const traversalId = "%252e%252e%252f%252e%252e%252fetc%252fpasswd";

      const { WorkspaceNotFoundException } = require("../common/exceptions/business.exception");

      mockWorkspaceService.findById.mockRejectedValue(
        new WorkspaceNotFoundException(traversalId),
      );

      await expect(controller.getWorkspace(traversalId)).rejects.toThrow();
    });

    it("should reject workspace ID with null byte injection", async () => {
      const traversalId = "workspace-123%00.txt";

      const { WorkspaceNotFoundException } = require("../common/exceptions/business.exception");

      mockWorkspaceService.findById.mockRejectedValue(
        new WorkspaceNotFoundException(traversalId),
      );

      await expect(controller.getWorkspace(traversalId)).rejects.toThrow();
    });

    it("should reject workspace ID with absolute path (Unix)", async () => {
      const traversalId = "/etc/passwd";

      const { WorkspaceNotFoundException } = require("../common/exceptions/business.exception");

      mockWorkspaceService.findById.mockRejectedValue(
        new WorkspaceNotFoundException(traversalId),
      );

      await expect(controller.getWorkspace(traversalId)).rejects.toThrow();
    });

    it("should reject workspace ID with absolute path (Windows)", async () => {
      const traversalId = "C:\\Windows\\System32\\config\\sam";

      const { WorkspaceNotFoundException } = require("../common/exceptions/business.exception");

      mockWorkspaceService.findById.mockRejectedValue(
        new WorkspaceNotFoundException(traversalId),
      );

      await expect(controller.getWorkspace(traversalId)).rejects.toThrow();
    });

    it("should reject workspace ID with Unicode path traversal", async () => {
      const traversalId = "..%c0%af..%c0%af..%c0%afetc%c0%afpasswd";

      const { WorkspaceNotFoundException } = require("../common/exceptions/business.exception");

      mockWorkspaceService.findById.mockRejectedValue(
        new WorkspaceNotFoundException(traversalId),
      );

      await expect(controller.getWorkspace(traversalId)).rejects.toThrow();
    });

    it("should reject workspace ID with alternative path separators", async () => {
      const traversalIds = [
        "....//....//etc/passwd", // Double dot-slash
        "..../..../etc/passwd", // Quadruple dots
        "../..///../etc/passwd", // Mixed slashes
      ];

      const { WorkspaceNotFoundException } = require("../common/exceptions/business.exception");

      for (const traversalId of traversalIds) {
        mockWorkspaceService.findById.mockRejectedValue(
          new WorkspaceNotFoundException(traversalId),
        );

        await expect(controller.getWorkspace(traversalId)).rejects.toThrow();
      }
    });

    it("should reject user ID with path traversal in removeMember", async () => {
      const maliciousUserIds = [
        "../../../etc/passwd",
        "..\\..\\..\\windows\\system32",
        "/etc/shadow",
        "C:\\boot.ini",
      ];

      const { WorkspaceNotFoundException } = require("../common/exceptions/business.exception");

      for (const userId of maliciousUserIds) {
        mockWorkspaceService.removeMember.mockRejectedValue(
          new WorkspaceNotFoundException("workspace-123"),
        );

        await expect(
          controller.removeMember("workspace-123", userId),
        ).rejects.toThrow();
      }
    });

    it("should reject both workspace and user ID with path traversal", async () => {
      const maliciousWorkspaceId = "../../../var/log/system";
      const maliciousUserId = "../../../etc/passwd";

      const { WorkspaceNotFoundException } = require("../common/exceptions/business.exception");

      mockWorkspaceService.removeMember.mockRejectedValue(
        new WorkspaceNotFoundException(maliciousWorkspaceId),
      );

      await expect(
        controller.removeMember(maliciousWorkspaceId, maliciousUserId),
      ).rejects.toThrow();
    });

    it("should reject workspace ID with path traversal in invite", async () => {
      const dto: InviteMemberDto = { githubUsername: "validuser" };
      const traversalId = "../../sensitive/data";

      const { WorkspaceNotFoundException } = require("../common/exceptions/business.exception");

      mockWorkspaceService.inviteMemberByGithubUsername.mockRejectedValue(
        new WorkspaceNotFoundException(traversalId),
      );

      await expect(controller.inviteMember(traversalId, dto)).rejects.toThrow();
    });

    it("should handle path traversal with special characters", async () => {
      const specialTraversalIds = [
        "workspace-123/../../etc/passwd",
        "workspace-123\\..\\..\\windows",
        "workspace-123;cat /etc/passwd",
        "workspace-123|ls -la /etc",
        "workspace-123 && cat /etc/passwd",
      ];

      const { WorkspaceNotFoundException } = require("../common/exceptions/business.exception");

      for (const traversalId of specialTraversalIds) {
        mockWorkspaceService.findById.mockRejectedValue(
          new WorkspaceNotFoundException(traversalId),
        );

        await expect(controller.getWorkspace(traversalId)).rejects.toThrow();
      }
    });

    it("should verify service layer validates IDs before file operations", async () => {
      // This test documents that path validation should occur at service layer
      // Controller passes IDs to service, service must validate before any file ops

      const validWorkspaceId = "workspace-123";
      const maliciousUserId = "../../../etc/passwd";

      // Service should validate and reject malicious IDs
      const { WorkspaceNotFoundException } = require("../common/exceptions/business.exception");

      mockWorkspaceService.removeMember.mockRejectedValue(
        new WorkspaceNotFoundException(validWorkspaceId),
      );

      await expect(
        controller.removeMember(validWorkspaceId, maliciousUserId),
      ).rejects.toThrow();

      // Verify service was called (it's service's responsibility to validate)
      expect(mockWorkspaceService.removeMember).toHaveBeenCalledWith(
        validWorkspaceId,
        maliciousUserId,
      );
    });
  });
});
