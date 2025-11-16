import { IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ValidateGithubTokenDto {
  @ApiProperty({
    description: "GitHub personal access token to validate",
    example: "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  })
  @IsNotEmpty({ message: "GitHub token is required" })
  @IsString({ message: "GitHub token must be a string" })
  token: string;
}
