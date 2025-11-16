import { Test, TestingModule } from "@nestjs/testing";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";

describe("UserController", () => {
  let controller: UserController;
  let userService: UserService;

  const mockUser = {
    id: "user-123",
    githubId: "github-123",
    githubUsername: "testuser",
    email: "test@example.com",
    avatarUrl: "https://github.com/avatar.png",
    createdAt: new Date("2025-01-01"),
  };

  const mockUserService = {
    findById: jest.fn(),
    findByGithubId: jest.fn(),
    findByGithubUsername: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("GET /users/me", () => {
    it("should return current authenticated user", async () => {
      const mockRequest = {
        user: { id: "user-123" },
      } as any;

      mockUserService.findById.mockResolvedValue(mockUser);

      const result = await controller.getMe(mockRequest);

      expect(userService.findById).toHaveBeenCalledWith("user-123");
      expect(userService.findById).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockUser);
      expect(result.id).toBe("user-123");
      expect(result.githubUsername).toBe("testuser");
      expect(result.email).toBe("test@example.com");
    });

    it("should return user without email", async () => {
      const userWithoutEmail = {
        ...mockUser,
        email: null,
      };

      const mockRequest = {
        user: { id: "user-123" },
      } as any;

      mockUserService.findById.mockResolvedValue(userWithoutEmail);

      const result = await controller.getMe(mockRequest);

      expect(result.email).toBeNull();
      expect(result.githubUsername).toBe("testuser");
    });

    it("should return user without avatar", async () => {
      const userWithoutAvatar = {
        ...mockUser,
        avatarUrl: null,
      };

      const mockRequest = {
        user: { id: "user-456" },
      } as any;

      mockUserService.findById.mockResolvedValue(userWithoutAvatar);

      const result = await controller.getMe(mockRequest);

      expect(userService.findById).toHaveBeenCalledWith("user-456");
      expect(result.avatarUrl).toBeNull();
    });

    it("should handle different user ids", async () => {
      const differentUser = {
        id: "user-789",
        githubId: "github-789",
        githubUsername: "anotheruser",
        email: "another@example.com",
        avatarUrl: "https://example.com/avatar2.png",
        createdAt: new Date("2025-01-10"),
      };

      const mockRequest = {
        user: { id: "user-789" },
      } as any;

      mockUserService.findById.mockResolvedValue(differentUser);

      const result = await controller.getMe(mockRequest);

      expect(userService.findById).toHaveBeenCalledWith("user-789");
      expect(result.id).toBe("user-789");
      expect(result.githubUsername).toBe("anotheruser");
    });

    it("should return full user data with all fields", async () => {
      const mockRequest = {
        user: { id: "user-123" },
      } as any;

      mockUserService.findById.mockResolvedValue(mockUser);

      const result = await controller.getMe(mockRequest);

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("githubId");
      expect(result).toHaveProperty("githubUsername");
      expect(result).toHaveProperty("email");
      expect(result).toHaveProperty("avatarUrl");
      expect(result).toHaveProperty("createdAt");
    });
  });

  describe("Error handling", () => {
    it("should propagate service errors", async () => {
      const mockRequest = {
        user: { id: "invalid-user" },
      } as any;

      mockUserService.findById.mockRejectedValue(
        new Error("User not found"),
      );

      await expect(controller.getMe(mockRequest)).rejects.toThrow(
        "User not found",
      );

      expect(userService.findById).toHaveBeenCalledWith("invalid-user");
    });

    it("should handle database connection errors", async () => {
      const mockRequest = {
        user: { id: "user-123" },
      } as any;

      mockUserService.findById.mockRejectedValue(
        new Error("Database connection failed"),
      );

      await expect(controller.getMe(mockRequest)).rejects.toThrow(
        "Database connection failed",
      );
    });

    it("should handle null user id", async () => {
      const mockRequest = {
        user: { id: null },
      } as any;

      mockUserService.findById.mockResolvedValue(null);

      const result = await controller.getMe(mockRequest);

      expect(userService.findById).toHaveBeenCalledWith(null);
      expect(result).toBeNull();
    });
  });
});
