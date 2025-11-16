import { IsNotEmpty, IsString, MinLength, MaxLength } from "class-validator";

export class CreateWorkspaceDto {
  @IsNotEmpty({ message: "Workspace name is required" })
  @IsString({ message: "Workspace name must be a string" })
  @MinLength(1, { message: "Workspace name must be at least 1 character" })
  @MaxLength(100, { message: "Workspace name must be at most 100 characters" })
  name: string;
}
