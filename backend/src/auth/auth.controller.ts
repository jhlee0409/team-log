import { Controller, Post, Body, UseGuards, Get, Req } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Throttle } from "@nestjs/throttler";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { ValidateGithubTokenDto } from "./dto/validate-github-token.dto";
import { RequestWithUser } from "./interfaces/request-with-user.interface";

@ApiTags("auth")
@Controller("auth")
@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute for auth endpoints
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiOperation({
    summary: "Validate GitHub token from VS Code",
    description:
      "Validates a GitHub token obtained from VS Code authentication and returns JWT",
  })
  @ApiResponse({
    status: 201,
    description: "Token validated successfully, JWT returned",
    schema: {
      example: {
        success: true,
        accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        user: {
          id: "user-uuid",
          githubId: "123456",
          githubUsername: "octocat",
          email: "octocat@github.com",
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "Invalid GitHub token",
    schema: {
      example: { success: false, message: "Invalid GitHub token" },
    },
  })
  @Post("github/token")
  async validateGithubToken(@Body() dto: ValidateGithubTokenDto) {
    const user = await this.authService.validateGithubToken(dto.token);

    if (!user) {
      return { success: false, message: "Invalid GitHub token" };
    }

    const result = await this.authService.generateToken(user);
    return { success: true, ...result };
  }

  @ApiOperation({
    summary: "Initiate GitHub OAuth flow",
    description: "Redirects to GitHub OAuth login page (for web clients)",
  })
  @ApiResponse({
    status: 302,
    description: "Redirects to GitHub OAuth",
  })
  @Get("github")
  @UseGuards(AuthGuard("github"))
  async githubLogin() {
    // Initiates GitHub OAuth flow
  }

  @ApiOperation({
    summary: "GitHub OAuth callback",
    description: "Handles GitHub OAuth callback and returns JWT",
  })
  @ApiResponse({
    status: 200,
    description: "OAuth successful, JWT returned",
    schema: {
      example: {
        accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        user: {
          id: "user-uuid",
          githubId: "123456",
          githubUsername: "octocat",
          email: "octocat@github.com",
        },
      },
    },
  })
  @Get("github/callback")
  @UseGuards(AuthGuard("github"))
  async githubCallback(@Req() req: RequestWithUser) {
    return this.authService.generateToken(req.user);
  }

  @ApiOperation({
    summary: "Get current user",
    description: "Returns the currently authenticated user's information",
  })
  @ApiBearerAuth("JWT-auth")
  @ApiResponse({
    status: 200,
    description: "User information returned",
    schema: {
      example: {
        id: "user-uuid",
        githubId: "123456",
        githubUsername: "octocat",
        email: "octocat@github.com",
      },
    },
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @Get("me")
  @UseGuards(AuthGuard("jwt"))
  async getMe(@Req() req: RequestWithUser) {
    return req.user;
  }
}
