import { Test, TestingModule } from "@nestjs/testing";
import { GithubStrategy } from "./github.strategy";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "../auth.service";
import { GithubProfile } from "../interfaces/github-profile.interface";
import { ValidatedUser } from "../interfaces/jwt-payload.interface";

describe("GithubStrategy", () => {
  let strategy: GithubStrategy;
  let authService: AuthService;
  let configService: ConfigService;

  const mockUser: ValidatedUser = {
    id: "user-123",
    githubId: "github-123",
    githubUsername: "testuser",
    email: "test@example.com",
    avatarUrl: "https://github.com/avatar.png",
  };

  const mockAuthService = {
    validateGithubUser: jest.fn(),
    validateGithubToken: jest.fn(),
    generateToken: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        GITHUB_CLIENT_ID: "test-client-id",
        GITHUB_CLIENT_SECRET: "test-client-secret",
        GITHUB_CALLBACK_URL: "http://localhost:3000/auth/github/callback",
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GithubStrategy,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<GithubStrategy>(GithubStrategy);
    authService = module.get<AuthService>(AuthService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(strategy).toBeDefined();
  });

  describe("validate", () => {
    it("should validate and return user for valid GitHub profile", async () => {
      const mockProfile: GithubProfile = {
        id: "github-123",
        username: "testuser",
        emails: [{ value: "test@example.com" }],
        photos: [{ value: "https://github.com/avatar.png" }],
      };

      mockAuthService.validateGithubUser.mockResolvedValue(mockUser);

      const result = await strategy.validate(
        "access-token",
        "refresh-token",
        mockProfile,
      );

      expect(authService.validateGithubUser).toHaveBeenCalledWith(mockProfile);
      expect(authService.validateGithubUser).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockUser);
      expect(result.id).toBe("user-123");
      expect(result.githubUsername).toBe("testuser");
    });

    it("should handle profile without email", async () => {
      const mockProfile: GithubProfile = {
        id: "github-456",
        username: "noemailuser",
        emails: [],
        photos: [{ value: "https://github.com/avatar2.png" }],
      };

      const userWithoutEmail: ValidatedUser = {
        id: "user-456",
        githubId: "github-456",
        githubUsername: "noemailuser",
        email: null,
        avatarUrl: "https://github.com/avatar2.png",
      };

      mockAuthService.validateGithubUser.mockResolvedValue(userWithoutEmail);

      const result = await strategy.validate(
        "access-token",
        "refresh-token",
        mockProfile,
      );

      expect(result.email).toBeNull();
      expect(result.githubUsername).toBe("noemailuser");
    });

    it("should handle profile without photos", async () => {
      const mockProfile: GithubProfile = {
        id: "github-789",
        username: "noavataruser",
        emails: [{ value: "noavatar@example.com" }],
        photos: [],
      };

      const userWithoutAvatar: ValidatedUser = {
        id: "user-789",
        githubId: "github-789",
        githubUsername: "noavataruser",
        email: "noavatar@example.com",
        avatarUrl: null,
      };

      mockAuthService.validateGithubUser.mockResolvedValue(userWithoutAvatar);

      const result = await strategy.validate(
        "access-token",
        "refresh-token",
        mockProfile,
      );

      expect(result.avatarUrl).toBeNull();
      expect(result.email).toBe("noavatar@example.com");
    });

    it("should create new user if not exists", async () => {
      const mockProfile: GithubProfile = {
        id: "github-999",
        username: "newuser",
        emails: [{ value: "new@example.com" }],
        photos: [{ value: "https://github.com/avatar999.png" }],
      };

      const newUser: ValidatedUser = {
        id: "user-999",
        githubId: "github-999",
        githubUsername: "newuser",
        email: "new@example.com",
        avatarUrl: "https://github.com/avatar999.png",
      };

      mockAuthService.validateGithubUser.mockResolvedValue(newUser);

      const result = await strategy.validate(
        "access-token",
        "refresh-token",
        mockProfile,
      );

      expect(authService.validateGithubUser).toHaveBeenCalledWith(mockProfile);
      expect(result).toEqual(newUser);
    });

    it("should handle different access tokens", async () => {
      const mockProfile: GithubProfile = {
        id: "github-123",
        username: "testuser",
        emails: [{ value: "test@example.com" }],
        photos: [{ value: "https://github.com/avatar.png" }],
      };

      mockAuthService.validateGithubUser.mockResolvedValue(mockUser);

      // Different tokens shouldn't affect the result
      await strategy.validate("token-1", "refresh-1", mockProfile);
      await strategy.validate("token-2", "refresh-2", mockProfile);

      expect(authService.validateGithubUser).toHaveBeenCalledTimes(2);
    });

    it("should handle service errors", async () => {
      const mockProfile: GithubProfile = {
        id: "github-123",
        username: "testuser",
        emails: [{ value: "test@example.com" }],
        photos: [{ value: "https://github.com/avatar.png" }],
      };

      mockAuthService.validateGithubUser.mockRejectedValue(
        new Error("Database error"),
      );

      await expect(
        strategy.validate("access-token", "refresh-token", mockProfile),
      ).rejects.toThrow("Database error");
    });
  });

});
