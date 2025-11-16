import { plainToInstance } from "class-transformer";
import {
  IsString,
  IsNumber,
  IsOptional,
  validateSync,
  Min,
  Max,
  MinLength,
} from "class-validator";

export class EnvironmentVariables {
  @IsString()
  DATABASE_URL: string;

  @IsString()
  @MinLength(32, {
    message: "JWT_SECRET must be at least 32 characters for security",
  })
  JWT_SECRET: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRATION?: string = "7d";

  @IsOptional()
  @IsString()
  GITHUB_CLIENT_ID?: string;

  @IsOptional()
  @IsString()
  GITHUB_CLIENT_SECRET?: string;

  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(65535)
  PORT?: number = 3000;

  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(65535)
  YJS_PORT?: number = 1234;

  @IsOptional()
  @IsString()
  ALLOWED_ORIGINS?: string = "http://localhost:3000,http://localhost:5173";

  @IsOptional()
  @IsString()
  NODE_ENV?: string = "development";
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const messages = errors.map((error) => {
      const constraints = Object.values(error.constraints || {});
      return `${error.property}: ${constraints.join(", ")}`;
    });

    throw new Error(
      `Environment validation failed:\n${messages.join("\n")}`,
    );
  }

  return validatedConfig;
}
