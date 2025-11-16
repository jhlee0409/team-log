import { IsNotEmpty, IsString, Matches } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class InviteMemberDto {
  @ApiProperty({
    description: "GitHub username to invite (with or without @ prefix)",
    example: "octocat",
    pattern: "^[a-z\\d](?:[a-z\\d]|-(?=[a-z\\d])){0,38}$",
  })
  @IsNotEmpty({ message: "GitHub username is required" })
  @IsString({ message: "GitHub username must be a string" })
  @Matches(/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i, {
    message: "Invalid GitHub username format",
  })
  githubUsername: string;
}
