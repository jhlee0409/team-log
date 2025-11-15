import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private userService: UserService,
  ) {}

  async validateGithubUser(profile: any) {
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

  async generateToken(user: any) {
    const payload = {
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

  async validateGithubToken(token: string) {
    try {
      // Verify GitHub token by fetching user info
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      const githubUser = await response.json();

      // Find or create user
      let user = await this.userService.findByGithubId(githubUser.id.toString());

      if (!user) {
        user = await this.userService.create({
          githubId: githubUser.id.toString(),
          githubUsername: githubUser.login,
          email: githubUser.email || null,
          avatarUrl: githubUser.avatar_url || null,
        });
      }

      return user;
    } catch (error) {
      console.error('GitHub token validation failed:', error);
      return null;
    }
  }
}
