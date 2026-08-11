import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  Max,
  Min,
  validateSync,
} from 'class-validator';
import { Type, plainToInstance } from 'class-transformer';

enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsOptional()
  @IsIn([NodeEnv.Development, NodeEnv.Production, NodeEnv.Test])
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3000;

  // --- Konnect ---
  @IsNotEmpty()
  @IsUrl(
    { require_tld: false },
    { message: 'KONNECT_BASE_URL must be a valid HTTPS URL' },
  )
  KONNECT_BASE_URL: string;

  @IsNotEmpty({ message: 'KONNECT_API_KEY is required' })
  KONNECT_API_KEY: string;

  @IsNotEmpty({ message: 'KONNECT_WALLET_ID is required' })
  KONNECT_WALLET_ID: string;

  @IsNotEmpty()
  @IsUrl(
    { require_tld: false },
    { message: 'KONNECT_WEBHOOK_URL must be a valid HTTPS URL' },
  )
  KONNECT_WEBHOOK_URL: string;

  // --- Database ---
  @IsNotEmpty()
  DB_HOST: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  DB_PORT = 3306;

  @IsNotEmpty()
  DB_USERNAME: string;

  @IsOptional()
  DB_PASSWORD = '';

  @IsNotEmpty()
  DB_DATABASE: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const messages = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Invalid environment configuration: ${messages}`);
  }

  return validatedConfig;
}
