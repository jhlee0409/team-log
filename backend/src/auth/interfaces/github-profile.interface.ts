export interface GithubProfile {
  id: string;
  username: string;
  emails?: Array<{ value: string }>;
  photos?: Array<{ value: string }>;
}

export interface GithubUserResponse {
  id: number;
  login: string;
  email: string | null;
  avatar_url: string | null;
}
