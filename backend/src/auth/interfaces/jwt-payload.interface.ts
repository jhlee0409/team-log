export interface JwtPayload {
  sub: string;
  githubId: string;
  githubUsername: string;
}

export interface ValidatedUser {
  id: string;
  githubId: string;
  githubUsername: string;
  email: string | null;
  avatarUrl: string | null;
}
