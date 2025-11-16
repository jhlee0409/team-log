import { IsOptional, IsDateString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class GetLogDto {
  @ApiPropertyOptional({
    description: "Date for the log in ISO 8601 format (defaults to today)",
    example: "2025-01-15",
    format: "date",
  })
  @IsOptional()
  @IsDateString({}, { message: "Invalid date format. Use ISO 8601 format" })
  date?: string;
}
