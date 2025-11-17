import { plainToInstance } from "class-transformer";
import {
  IsString,
  IsNumber,
  IsOptional,
  validateSync,
  Min,
  Max,
  MinLength,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from "class-validator";

// Custom validator to check JWT_SECRET entropy
function IsStrongSecret(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "isStrongSecret",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== "string") return false;

          // Check minimum length
          if (value.length < 32) return false;

          // Check for character diversity (entropy)
          const hasLowercase = /[a-z]/.test(value);
          const hasUppercase = /[A-Z]/.test(value);
          const hasNumber = /\d/.test(value);
          const hasSpecial = /[@$!%*?&\-_=+#^~]/.test(value);

          // Require at least 3 of 4 character types for good entropy
          const characterTypeCount = [
            hasLowercase,
            hasUppercase,
            hasNumber,
            hasSpecial,
          ].filter(Boolean).length;

          return characterTypeCount >= 3;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be at least 32 characters and contain at least 3 of: lowercase, uppercase, numbers, special characters (@$!%*?&-_=+#^~)`;
        },
      },
    });
  };
}

export class EnvironmentVariables {
  @IsString()
  DATABASE_URL: string;

  @IsString()
  @MinLength(32, {
    message: "JWT_SECRET must be at least 32 characters for security",
  })
  @IsStrongSecret()
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

    throw new Error(`Environment validation failed:\n${messages.join("\n")}`);
  }

  return validatedConfig;
}
