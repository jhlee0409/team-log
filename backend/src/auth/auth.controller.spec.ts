import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { ValidateGithubTokenDto } from "./dto/validate-github-token.dto";
import { ValidatedUser } from "./interfaces/jwt-payload.interface";

describe("AuthController", () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockValidatedUser: ValidatedUser = {
    id: "user-123",
    githubId: "github-123",
    githubUsername: "testuser",
    email: "test@example.com",
    avatarUrl: "https://github.com/avatar.png",
  };

  const mockAuthService = {
    validateGithubToken: jest.fn(),
    generateToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("POST /auth/github/token", () => {
    const validTokenDto: ValidateGithubTokenDto = {
      token: "ghp_validtoken123",
    };

    it("should return success with access token for valid GitHub token", async () => {
      const mockTokenResult = {
        access_token: "jwt.token.here",
        user: {
          id: mockValidatedUser.id,
          githubId: mockValidatedUser.githubId,
          githubUsername: mockValidatedUser.githubUsername,
          email: mockValidatedUser.email,
          avatarUrl: mockValidatedUser.avatarUrl,
        },
      };

      mockAuthService.validateGithubToken.mockResolvedValue(mockValidatedUser);
      mockAuthService.generateToken.mockResolvedValue(mockTokenResult);

      const result = await controller.validateGithubToken(validTokenDto);

      expect(mockAuthService.validateGithubToken).toHaveBeenCalledWith(
        validTokenDto.token,
      );
      expect(mockAuthService.validateGithubToken).toHaveBeenCalledTimes(1);

      expect(mockAuthService.generateToken).toHaveBeenCalledWith(
        mockValidatedUser,
      );
      expect(mockAuthService.generateToken).toHaveBeenCalledTimes(1);

      expect(result).toEqual({
        success: true,
        access_token: mockTokenResult.access_token,
        user: mockTokenResult.user,
      });
      expect(result.success).toBe(true);

      if ("access_token" in result) {
        expect(result.access_token).toBeDefined();
        expect(result.user.githubUsername).toBe("testuser");
      }
    });

    it("should return failure message for invalid GitHub token", async () => {
      const invalidTokenDto: ValidateGithubTokenDto = {
        token: "invalid_token",
      };

      mockAuthService.validateGithubToken.mockResolvedValue(null);

      const result = await controller.validateGithubToken(invalidTokenDto);

      expect(mockAuthService.validateGithubToken).toHaveBeenCalledWith(
        invalidTokenDto.token,
      );
      expect(mockAuthService.validateGithubToken).toHaveBeenCalledTimes(1);

      expect(mockAuthService.generateToken).not.toHaveBeenCalled();

      expect(result).toEqual({
        success: false,
        message: "Invalid GitHub token",
      });
      expect(result.success).toBe(false);
    });

    it("should return failure for expired GitHub token", async () => {
      const expiredTokenDto: ValidateGithubTokenDto = {
        token: "ghp_expiredtoken",
      };

      mockAuthService.validateGithubToken.mockResolvedValue(null);

      const result = await controller.validateGithubToken(expiredTokenDto);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid GitHub token");
      expect(mockAuthService.generateToken).not.toHaveBeenCalled();
    });

    it("should handle service errors gracefully", async () => {
      mockAuthService.validateGithubToken.mockRejectedValue(
        new Error("Service error"),
      );

      await expect(
        controller.validateGithubToken(validTokenDto),
      ).rejects.toThrow("Service error");

      expect(mockAuthService.validateGithubToken).toHaveBeenCalledTimes(1);
      expect(mockAuthService.generateToken).not.toHaveBeenCalled();
    });
  });

  describe("GET /auth/github/callback", () => {
    it("should generate token for authenticated GitHub user", async () => {
      const mockRequest = {
        user: mockValidatedUser,
      } as any;

      const mockTokenResult = {
        access_token: "jwt.token.callback",
        user: {
          id: mockValidatedUser.id,
          githubId: mockValidatedUser.githubId,
          githubUsername: mockValidatedUser.githubUsername,
          email: mockValidatedUser.email,
          avatarUrl: mockValidatedUser.avatarUrl,
        },
      };

      mockAuthService.generateToken.mockResolvedValue(mockTokenResult);

      const result = await controller.githubCallback(mockRequest);

      expect(mockAuthService.generateToken).toHaveBeenCalledWith(
        mockValidatedUser,
      );
      expect(mockAuthService.generateToken).toHaveBeenCalledTimes(1);

      expect(result).toEqual(mockTokenResult);
      expect(result.access_token).toBe("jwt.token.callback");
    });

    it("should handle different user profiles", async () => {
      const differentUser: ValidatedUser = {
        id: "user-456",
        githubId: "github-456",
        githubUsername: "anotheruser",
        email: null, // No email
        avatarUrl: null, // No avatar
      };

      const mockRequest = {
        user: differentUser,
      } as any;

      const mockTokenResult = {
        access_token: "jwt.token.noavatar",
        user: {
          id: differentUser.id,
          githubId: differentUser.githubId,
          githubUsername: differentUser.githubUsername,
          email: null,
          avatarUrl: null,
        },
      };

      mockAuthService.generateToken.mockResolvedValue(mockTokenResult);

      const result = await controller.githubCallback(mockRequest);

      expect(result.user.email).toBeNull();
      expect(result.user.avatarUrl).toBeNull();
      expect(result.user.githubUsername).toBe("anotheruser");
    });
  });

  describe("GET /auth/me", () => {
    it("should return current authenticated user", async () => {
      const mockRequest = {
        user: mockValidatedUser,
      } as any;

      const result = await controller.getMe(mockRequest);

      expect(result).toEqual(mockValidatedUser);
      expect(result.id).toBe("user-123");
      expect(result.githubUsername).toBe("testuser");
      expect(result.email).toBe("test@example.com");
    });

    it("should return user without optional fields", async () => {
      const minimalUser: ValidatedUser = {
        id: "user-minimal",
        githubId: "github-minimal",
        githubUsername: "minimaluser",
        email: null,
        avatarUrl: null,
      };

      const mockRequest = {
        user: minimalUser,
      } as any;

      const result = await controller.getMe(mockRequest);

      expect(result).toEqual(minimalUser);
      expect(result.email).toBeNull();
      expect(result.avatarUrl).toBeNull();
    });
  });

  describe("Edge cases", () => {
    it("should handle empty token string", async () => {
      const emptyTokenDto: ValidateGithubTokenDto = {
        token: "",
      };

      mockAuthService.validateGithubToken.mockResolvedValue(null);

      const result = await controller.validateGithubToken(emptyTokenDto);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid GitHub token");
    });

    it("should handle whitespace-only token", async () => {
      const whitespaceTokenDto: ValidateGithubTokenDto = {
        token: "   ",
      };

      mockAuthService.validateGithubToken.mockResolvedValue(null);

      const result = await controller.validateGithubToken(whitespaceTokenDto);

      expect(result.success).toBe(false);
    });
  });
});
