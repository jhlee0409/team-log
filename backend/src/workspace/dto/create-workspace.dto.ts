import { IsNotEmpty, IsString, MinLength, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateWorkspaceDto {
  @ApiProperty({
    description: "Name of the workspace",
    example: "My Team Workspace",
    minLength: 1,
    maxLength: 100,
  })
  @IsNotEmpty({ message: "Workspace name is required" })
  @IsString({ message: "Workspace name must be a string" })
  @MinLength(1, { message: "Workspace name must be at least 1 character" })
  @MaxLength(100, { message: "Workspace name must be at most 100 characters" })
  name: string;
}
