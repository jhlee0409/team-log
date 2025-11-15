import { IsNotEmpty, IsString } from 'class-validator';

export class ValidateGithubTokenDto {
  @IsNotEmpty({ message: 'GitHub token is required' })
  @IsString({ message: 'GitHub token must be a string' })
  token: string;
}
