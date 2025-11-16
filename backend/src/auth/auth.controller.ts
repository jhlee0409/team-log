import { Controller, Post, Body, UseGuards, Get, Req } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { ValidateGithubTokenDto } from "./dto/validate-github-token.dto";
import { RequestWithUser } from "./interfaces/request-with-user.interface";

@Controller("auth")
@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute for auth endpoints
export class AuthController {
  constructor(private authService: AuthService) {}

  // For VS Code extension - validate GitHub token from vscode.authentication
  @Post("github/token")
  async validateGithubToken(@Body() dto: ValidateGithubTokenDto) {
    const user = await this.authService.validateGithubToken(dto.token);

    if (!user) {
      return { success: false, message: "Invalid GitHub token" };
    }

    const result = await this.authService.generateToken(user);
    return { success: true, ...result };
  }

  // Traditional GitHub OAuth flow (optional, for web clients)
  @Get("github")
  @UseGuards(AuthGuard("github"))
  async githubLogin() {
    // Initiates GitHub OAuth flow
  }

  @Get("github/callback")
  @UseGuards(AuthGuard("github"))
  async githubCallback(@Req() req: RequestWithUser) {
    return this.authService.generateToken(req.user);
  }

  @Get("me")
  @UseGuards(AuthGuard("jwt"))
  async getMe(@Req() req: RequestWithUser) {
    return req.user;
  }
}
