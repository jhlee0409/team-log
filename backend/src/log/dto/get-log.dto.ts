import { IsOptional, IsDateString } from 'class-validator';

export class GetLogDto {
  @IsOptional()
  @IsDateString({}, { message: 'Invalid date format. Use ISO 8601 format' })
  date?: string;
}
