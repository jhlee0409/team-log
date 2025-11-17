import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { UserService } from "../user/user.service";
import { GithubProfile } from "./interfaces/github-profile.interface";
import { ValidatedUser } from "./interfaces/jwt-payload.interface";

describe("AuthService", () => {
  let service: AuthService;

  const mockUser: ValidatedUser = {
    id: "1",
    githubId: "12345",
    githubUsername: "testuser",
    email: "test@example.com",
    avatarUrl: "https://avatar.url",
  };

  const mockUserService = {
    findByGithubId: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("validateGithubUser", () => {
    const mockProfile: GithubProfile = {
      id: "12345",
      username: "testuser",
      emails: [{ value: "test@example.com" }],
      photos: [{ value: "https://avatar.url" }],
    };

    it("should return existing user if found", async () => {
      mockUserService.findByGithubId.mockResolvedValue(mockUser);

      const result = await service.validateGithubUser(mockProfile);

      expect(result).toEqual(mockUser);
      expect(mockUserService.findByGithubId).toHaveBeenCalledWith("12345");
      expect(mockUserService.create).not.toHaveBeenCalled();
    });

    it("should create new user if not found", async () => {
      mockUserService.findByGithubId.mockResolvedValue(null);
      mockUserService.create.mockResolvedValue(mockUser);

      const result = await service.validateGithubUser(mockProfile);

      expect(result).toEqual(mockUser);
      expect(mockUserService.create).toHaveBeenCalledWith({
        githubId: "12345",
        githubUsername: "testuser",
        email: "test@example.com",
        avatarUrl: "https://avatar.url",
      });
    });

    it("should handle profile without email or avatar", async () => {
      const profileWithoutOptionals: GithubProfile = {
        id: "12345",
        username: "testuser",
      };

      mockUserService.findByGithubId.mockResolvedValue(null);
      mockUserService.create.mockResolvedValue(mockUser);

      await service.validateGithubUser(profileWithoutOptionals);

      expect(mockUserService.create).toHaveBeenCalledWith({
        githubId: "12345",
        githubUsername: "testuser",
        email: null,
        avatarUrl: null,
      });
    });
  });

  describe("generateToken", () => {
    it("should generate JWT token and return user data", async () => {
      const mockToken = "mock.jwt.token";
      mockJwtService.sign.mockReturnValue(mockToken);

      const result = await service.generateToken(mockUser);

      expect(result).toEqual({
        access_token: mockToken,
        user: {
          id: mockUser.id,
          githubId: mockUser.githubId,
          githubUsername: mockUser.githubUsername,
          email: mockUser.email,
          avatarUrl: mockUser.avatarUrl,
        },
      });

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        githubId: mockUser.githubId,
        githubUsername: mockUser.githubUsername,
      });
    });
  });

  describe("validateGithubToken", () => {
    const mockGithubResponse = {
      id: 12345,
      login: "testuser",
      email: "test@example.com",
      avatar_url: "https://avatar.url",
    };

    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should validate token and return existing user", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockGithubResponse,
      });

      mockUserService.findByGithubId.mockResolvedValue(mockUser);

      const result = await service.validateGithubToken("valid-token");

      expect(result).toEqual(mockUser);
      expect(global.fetch).toHaveBeenCalledWith("https://api.github.com/user", {
        headers: {
          Authorization: "Bearer valid-token",
        },
      });
    });

    it("should create new user if not found", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockGithubResponse,
      });

      mockUserService.findByGithubId.mockResolvedValue(null);
      mockUserService.create.mockResolvedValue(mockUser);

      const result = await service.validateGithubToken("valid-token");

      expect(result).toEqual(mockUser);
      expect(mockUserService.create).toHaveBeenCalled();
    });

    it("should return null for invalid token", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
      });

      const result = await service.validateGithubToken("invalid-token");

      expect(result).toBeNull();
    });

    it("should return null on fetch error", async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      const result = await service.validateGithubToken("token");

      expect(result).toBeNull();
    });
  });
});
