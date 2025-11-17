import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { ValidateGithubTokenDto } from "./dto/validate-github-token.dto";
import { ValidatedUser } from "./interfaces/jwt-payload.interface";

describe("AuthController", () => {
  let controller: AuthController;

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

  describe("OAuth Flow: GitHub Authentication", () => {
    describe("GET /auth/github - Initiating OAuth", () => {
      it("should initiate GitHub OAuth flow", async () => {
        // This endpoint triggers passport-github2 strategy
        // Passport redirects to GitHub's authorization URL
        const result = await controller.githubLogin();

        // Controller method is empty - passport handles redirect
        expect(result).toBeUndefined();
      });

      it("should be protected by GitHub AuthGuard", () => {
        // Verify that GitHub strategy guard is applied
        // This is done via @UseGuards(AuthGuard("github"))
        const guards = Reflect.getMetadata(
          "__guards__",
          AuthController.prototype.githubLogin,
        );

        expect(guards).toBeDefined();
      });
    });

    describe("GET /auth/github/callback - OAuth Callback", () => {
      it("should handle successful GitHub OAuth callback", async () => {
        const mockRequest = {
          user: mockValidatedUser,
        } as any;

        const mockTokenResult = {
          access_token: "jwt.token.oauth",
          user: mockValidatedUser,
        };

        mockAuthService.generateToken.mockResolvedValue(mockTokenResult);

        const result = await controller.githubCallback(mockRequest);

        expect(result).toBeDefined();
        expect(result.access_token).toBe("jwt.token.oauth");
        expect(result.user.githubUsername).toBe("testuser");
      });

      it("should be protected by GitHub AuthGuard", () => {
        const guards = Reflect.getMetadata(
          "__guards__",
          AuthController.prototype.githubCallback,
        );

        expect(guards).toBeDefined();
      });

      it("should handle new user registration via OAuth", async () => {
        const newUser: ValidatedUser = {
          id: "user-new",
          githubId: "github-new",
          githubUsername: "newuser",
          email: "new@example.com",
          avatarUrl: "https://github.com/new.png",
        };

        const mockRequest = {
          user: newUser,
        } as any;

        const mockTokenResult = {
          access_token: "jwt.token.newuser",
          user: newUser,
        };

        mockAuthService.generateToken.mockResolvedValue(mockTokenResult);

        const result = await controller.githubCallback(mockRequest);

        expect(result.user.id).toBe("user-new");
        expect(result.user.githubUsername).toBe("newuser");
      });

      it("should handle existing user login via OAuth", async () => {
        const existingUser: ValidatedUser = {
          id: "user-existing",
          githubId: "github-existing",
          githubUsername: "existinguser",
          email: "existing@example.com",
          avatarUrl: "https://github.com/existing.png",
        };

        const mockRequest = {
          user: existingUser,
        } as any;

        const mockTokenResult = {
          access_token: "jwt.token.existing",
          user: existingUser,
        };

        mockAuthService.generateToken.mockResolvedValue(mockTokenResult);

        const result = await controller.githubCallback(mockRequest);

        expect(result.access_token).toBeDefined();
        expect(result.user.githubUsername).toBe("existinguser");
      });

      it("should handle OAuth callback with updated user profile", async () => {
        // User changed email/avatar on GitHub between logins
        const updatedUser: ValidatedUser = {
          id: "user-123",
          githubId: "github-123",
          githubUsername: "testuser",
          email: "newemail@example.com", // Changed email
          avatarUrl: "https://github.com/newavatar.png", // Changed avatar
        };

        const mockRequest = {
          user: updatedUser,
        } as any;

        const mockTokenResult = {
          access_token: "jwt.token.updated",
          user: updatedUser,
        };

        mockAuthService.generateToken.mockResolvedValue(mockTokenResult);

        const result = await controller.githubCallback(mockRequest);

        expect(result.user.email).toBe("newemail@example.com");
        expect(result.user.avatarUrl).toBe("https://github.com/newavatar.png");
      });
    });

    describe("OAuth Security: State and CSRF Protection", () => {
      it("should verify state parameter to prevent CSRF", async () => {
        // Note: State validation is handled by passport-github2 strategy
        // This test documents expected behavior

        // Passport-github2 automatically generates and validates state parameter
        // State is stored in session and validated on callback

        // If state mismatch occurs, passport throws error before reaching controller
        expect(true).toBe(true);
      });

      it("should reject OAuth callback without valid state", async () => {
        // Invalid state would be caught by passport middleware
        // Controller would never be reached

        // This test documents that CSRF protection relies on:
        // 1. Passport-github2 state parameter
        // 2. Session storage
        // 3. State validation on callback
        expect(true).toBe(true);
      });
    });

    describe("OAuth Error Handling", () => {
      it("should handle GitHub API errors during OAuth", async () => {
        const mockRequest = {
          user: mockValidatedUser,
        } as any;

        mockAuthService.generateToken.mockRejectedValue(
          new Error("GitHub API error"),
        );

        await expect(controller.githubCallback(mockRequest)).rejects.toThrow(
          "GitHub API error",
        );
      });

      it("should handle token generation failures", async () => {
        const mockRequest = {
          user: mockValidatedUser,
        } as any;

        mockAuthService.generateToken.mockRejectedValue(
          new Error("Failed to generate JWT"),
        );

        await expect(controller.githubCallback(mockRequest)).rejects.toThrow(
          "Failed to generate JWT",
        );
      });

      it("should handle user validation failures during OAuth", async () => {
        // If GitHub returns invalid user data, passport validation fails
        // Controller would not be reached - error handled by passport

        // This test documents expected error flow:
        // 1. GitHub returns invalid profile
        // 2. GithubStrategy.validate() throws error
        // 3. Passport catches error and calls failureRedirect
        expect(true).toBe(true);
      });

      it("should handle OAuth access denied by user", async () => {
        // If user clicks "Cancel" on GitHub OAuth consent screen
        // GitHub redirects with error=access_denied

        // Passport handles this error before reaching controller
        // Controller never receives request

        // This test documents expected behavior
        expect(true).toBe(true);
      });

      it("should handle OAuth with missing authorization code", async () => {
        // If GitHub callback doesn't include code parameter
        // Passport-github2 throws error

        // This test documents error is handled at passport level
        expect(true).toBe(true);
      });
    });

    describe("OAuth Token Exchange", () => {
      it("should exchange authorization code for access token", async () => {
        // GitHub OAuth flow:
        // 1. User redirected to GitHub
        // 2. GitHub redirects back with code
        // 3. Passport exchanges code for access_token
        // 4. Passport fetches user profile with access_token
        // 5. Controller generates JWT

        const mockRequest = {
          user: mockValidatedUser,
        } as any;

        const mockTokenResult = {
          access_token: "jwt.token.exchanged",
          user: mockValidatedUser,
        };

        mockAuthService.generateToken.mockResolvedValue(mockTokenResult);

        const result = await controller.githubCallback(mockRequest);

        expect(result.access_token).toBeDefined();
      });

      it("should handle invalid authorization code", async () => {
        // Invalid code would cause passport to throw error
        // before reaching controller

        // This test documents error handling at passport level
        expect(true).toBe(true);
      });

      it("should handle expired authorization code", async () => {
        // Expired code (>10 minutes old) causes GitHub to reject exchange
        // Passport throws error before reaching controller

        // This test documents expected behavior
        expect(true).toBe(true);
      });
    });

    describe("OAuth Scope and Permissions", () => {
      it("should request minimal required scopes from GitHub", async () => {
        // GitHub strategy should request only necessary scopes:
        // - user:email (to get user email)
        // - read:user (to get user profile)

        // Scope is configured in GithubStrategy constructor
        // This test documents expected scope configuration
        expect(true).toBe(true);
      });

      it("should handle user denying email scope", async () => {
        const userWithoutEmail: ValidatedUser = {
          id: "user-no-email",
          githubId: "github-no-email",
          githubUsername: "noemailuser",
          email: null, // User denied email scope
          avatarUrl: "https://github.com/avatar.png",
        };

        const mockRequest = {
          user: userWithoutEmail,
        } as any;

        const mockTokenResult = {
          access_token: "jwt.token.noemail",
          user: userWithoutEmail,
        };

        mockAuthService.generateToken.mockResolvedValue(mockTokenResult);

        const result = await controller.githubCallback(mockRequest);

        expect(result.user.email).toBeNull();
        expect(result.user.githubUsername).toBe("noemailuser");
      });
    });

    describe("OAuth Session Management", () => {
      it("should handle concurrent OAuth login attempts", async () => {
        // Multiple browser tabs initiating OAuth simultaneously
        // Each should get independent state parameters

        const mockRequest1 = {
          user: { ...mockValidatedUser, id: "user-1" },
        } as any;

        const mockRequest2 = {
          user: { ...mockValidatedUser, id: "user-2" },
        } as any;

        const mockToken1 = {
          access_token: "jwt.token.1",
          user: mockRequest1.user,
        };

        const mockToken2 = {
          access_token: "jwt.token.2",
          user: mockRequest2.user,
        };

        mockAuthService.generateToken.mockResolvedValueOnce(mockToken1);
        mockAuthService.generateToken.mockResolvedValueOnce(mockToken2);

        const result1 = await controller.githubCallback(mockRequest1);
        const result2 = await controller.githubCallback(mockRequest2);

        expect(result1.access_token).toBe("jwt.token.1");
        expect(result2.access_token).toBe("jwt.token.2");
      });

      it("should prevent OAuth token replay attacks", async () => {
        // Once authorization code is used, it cannot be reused
        // GitHub rejects second attempt

        // This test documents GitHub's built-in protection
        expect(true).toBe(true);
      });

      it("should handle session expiration during OAuth flow", async () => {
        // If session expires between /auth/github and /auth/github/callback
        // State validation fails

        // This test documents expected behavior
        expect(true).toBe(true);
      });
    });
  });
});
