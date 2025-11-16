import { Test, TestingModule } from "@nestjs/testing";
import { JwtStrategy } from "./jwt.strategy";
import { ConfigService } from "@nestjs/config";
import { UserService } from "../../user/user.service";
import { JwtPayload, ValidatedUser } from "../interfaces/jwt-payload.interface";

describe("JwtStrategy", () => {
  let strategy: JwtStrategy;
  let userService: UserService;
  let configService: ConfigService;

  const mockUser: ValidatedUser = {
    id: "user-123",
    githubId: "github-123",
    githubUsername: "testuser",
    email: "test@example.com",
    avatarUrl: "https://github.com/avatar.png",
  };

  const mockUserService = {
    findById: jest.fn(),
    findByGithubId: jest.fn(),
    findByGithubUsername: jest.fn(),
    create: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        JWT_SECRET: "test-secret-key",
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    userService = module.get<UserService>(UserService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(strategy).toBeDefined();
  });

  describe("validate", () => {
    it("should validate and return user for valid JWT payload", async () => {
      const payload: JwtPayload = {
        sub: "user-123",
        githubId: "github-123",
        githubUsername: "testuser",
      };

      mockUserService.findById.mockResolvedValue(mockUser);

      const result = await strategy.validate(payload);

      expect(userService.findById).toHaveBeenCalledWith("user-123");
      expect(userService.findById).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockUser);
      expect(result?.id).toBe("user-123");
      expect(result?.githubUsername).toBe("testuser");
    });

    it("should return null when user not found", async () => {
      const payload: JwtPayload = {
        sub: "invalid-user",
        githubId: "github-456",
        githubUsername: "nonexistent",
      };

      mockUserService.findById.mockResolvedValue(null);

      const result = await strategy.validate(payload);

      expect(userService.findById).toHaveBeenCalledWith("invalid-user");
      expect(result).toBeNull();
    });

    it("should validate different users correctly", async () => {
      const user2: ValidatedUser = {
        id: "user-456",
        githubId: "github-456",
        githubUsername: "anotheruser",
        email: null,
        avatarUrl: null,
      };

      const payload: JwtPayload = {
        sub: "user-456",
        githubId: "github-456",
        githubUsername: "anotheruser",
      };

      mockUserService.findById.mockResolvedValue(user2);

      const result = await strategy.validate(payload);

      expect(result).toEqual(user2);
      expect(result?.email).toBeNull();
      expect(result?.avatarUrl).toBeNull();
    });

    it("should handle database errors", async () => {
      const payload: JwtPayload = {
        sub: "user-123",
        githubId: "github-123",
        githubUsername: "testuser",
      };

      mockUserService.findById.mockRejectedValue(
        new Error("Database error"),
      );

      await expect(strategy.validate(payload)).rejects.toThrow(
        "Database error",
      );
    });

    it("should extract user id from payload.sub", async () => {
      const payload: JwtPayload = {
        sub: "user-789",
        githubId: "github-789",
        githubUsername: "thirduser",
      };

      const user3: ValidatedUser = {
        id: "user-789",
        githubId: "github-789",
        githubUsername: "thirduser",
        email: "third@example.com",
        avatarUrl: "https://example.com/avatar3.png",
      };

      mockUserService.findById.mockResolvedValue(user3);

      const result = await strategy.validate(payload);

      expect(userService.findById).toHaveBeenCalledWith("user-789");
      expect(result?.id).toBe("user-789");
    });
  });

});
