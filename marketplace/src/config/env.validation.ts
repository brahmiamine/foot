import {
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
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
  PORT = 3011;

  @IsNotEmpty({ message: 'SELLER_JWT_SECRET is required' })
  SELLER_JWT_SECRET: string;

  @IsNotEmpty({ message: 'SERVICE_API_KEYS is required' })
  SERVICE_API_KEYS: string;

  @IsOptional()
  SERVICE_API_KEYS_PREVIOUS?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'SERVICE_API_KEYS_PREVIOUS_EXPIRES_AT must be an ISO 8601 date' })
  SERVICE_API_KEYS_PREVIOUS_EXPIRES_AT?: string;

  @IsOptional()
  PAYMENT_API_URL?: string;

  @IsOptional()
  PAYMENT_API_KEY?: string;

  @IsOptional()
  @IsIn(['konnect', 'flouci', 'paymee'])
  PAYMENT_PROVIDER?: string;

  @IsOptional()
  PAYMENT_WEBHOOK_SECRET?: string;

  @IsOptional()
  NOTIFICATION_API_URL?: string;

  @IsOptional()
  NOTIFICATION_API_KEY?: string;

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

function validateRotationPair(config: EnvironmentVariables): void {
  const hasPrevious = Boolean(config.SERVICE_API_KEYS_PREVIOUS?.trim());
  const hasExpiry = Boolean(config.SERVICE_API_KEYS_PREVIOUS_EXPIRES_AT?.trim());
  if (hasPrevious !== hasExpiry) {
    throw new Error(
      'Invalid environment configuration: SERVICE_API_KEYS_PREVIOUS and SERVICE_API_KEYS_PREVIOUS_EXPIRES_AT must be configured together',
    );
  }
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });
  if (errors.length > 0) {
    const messages = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Invalid environment configuration: ${messages}`);
  }
  validateRotationPair(validatedConfig);
  return validatedConfig;
}
