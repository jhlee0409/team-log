import { Controller, Post, Body, UseGuards, Get, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // For VS Code extension - validate GitHub token from vscode.authentication
  @Post('github/token')
  async validateGithubToken(@Body('token') token: string) {
    const user = await this.authService.validateGithubToken(token);

    if (!user) {
      return { success: false, message: 'Invalid GitHub token' };
    }

    const result = await this.authService.generateToken(user);
    return { success: true, ...result };
  }

  // Traditional GitHub OAuth flow (optional, for web clients)
  @Get('github')
  @UseGuards(AuthGuard('github'))
  async githubLogin() {
    // Initiates GitHub OAuth flow
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(@Req() req) {
    return this.authService.generateToken(req.user);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getMe(@Req() req) {
    return req.user;
  }
}
