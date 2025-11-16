import { IsNotEmpty, IsString, Matches } from "class-validator";

export class InviteMemberDto {
  @IsNotEmpty({ message: "GitHub username is required" })
  @IsString({ message: "GitHub username must be a string" })
  @Matches(/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i, {
    message: "Invalid GitHub username format",
  })
  githubUsername: string;
}
