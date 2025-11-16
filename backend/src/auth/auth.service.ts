import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserService } from "../user/user.service";
import {
  GithubProfile,
  GithubUserResponse,
} from "./interfaces/github-profile.interface";
import { JwtPayload, ValidatedUser } from "./interfaces/jwt-payload.interface";
import { LoggerService } from "../common/logger/logger.service";

@Injectable()
export class AuthService {
  private logger = new LoggerService(AuthService.name);

  constructor(
    private jwtService: JwtService,
    private userService: UserService,
  ) {}

  async validateGithubUser(profile: GithubProfile): Promise<ValidatedUser> {
    const { id, username, emails, photos } = profile;

    // Find or create user
    let user = await this.userService.findByGithubId(id);

    if (!user) {
      user = await this.userService.create({
        githubId: id,
        githubUsername: username,
        email: emails?.[0]?.value || null,
        avatarUrl: photos?.[0]?.value || null,
      });
    }

    return user;
  }

  async generateToken(user: ValidatedUser) {
    const payload: JwtPayload = {
      sub: user.id,
      githubId: user.githubId,
      githubUsername: user.githubUsername,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        githubId: user.githubId,
        githubUsername: user.githubUsername,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async validateGithubToken(token: string): Promise<ValidatedUser | null> {
    this.logger.log("Validating GitHub token", AuthService.name);

    try {
      // Verify GitHub token by fetching user info
      const response = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        this.logger.warn(
          "GitHub token validation failed: invalid token",
          AuthService.name,
          {
            statusCode: response.status,
          },
        );
        return null;
      }

      const githubUser = (await response.json()) as GithubUserResponse;

      // Find or create user
      let user = await this.userService.findByGithubId(
        githubUser.id.toString(),
      );

      if (!user) {
        user = await this.userService.create({
          githubId: githubUser.id.toString(),
          githubUsername: githubUser.login,
          email: githubUser.email || null,
          avatarUrl: githubUser.avatar_url || null,
        });

        this.logger.log(
          "New user created from GitHub token",
          AuthService.name,
          {
            userId: user.id,
            githubUsername: user.githubUsername,
          },
        );
      } else {
        this.logger.log(
          "GitHub token validated successfully",
          AuthService.name,
          {
            userId: user.id,
            githubUsername: user.githubUsername,
          },
        );
      }

      return user;
    } catch (error) {
      this.logger.error(
        "GitHub token validation failed",
        error instanceof Error ? error.stack : undefined,
        AuthService.name,
        {
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      );
      return null;
    }
  }
}
