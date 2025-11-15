import { IsOptional, IsDateString } from 'class-validator';

export class GetLogsRangeDto {
  @IsOptional()
  @IsDateString({}, { message: 'Invalid startDate format. Use ISO 8601 format' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Invalid endDate format. Use ISO 8601 format' })
  endDate?: string;
}
