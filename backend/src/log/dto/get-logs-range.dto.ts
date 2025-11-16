import { IsOptional, IsDateString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class GetLogsRangeDto {
  @ApiPropertyOptional({
    description: "Start date for the range in ISO 8601 format",
    example: "2025-01-01",
    format: "date",
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: "Invalid startDate format. Use ISO 8601 format" },
  )
  startDate?: string;

  @ApiPropertyOptional({
    description: "End date for the range in ISO 8601 format",
    example: "2025-01-15",
    format: "date",
  })
  @IsOptional()
  @IsDateString({}, { message: "Invalid endDate format. Use ISO 8601 format" })
  endDate?: string;
}
