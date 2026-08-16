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
  PORT = 3010;

  @IsNotEmpty({ message: 'SSO_JWT_SECRET is required' })
  SSO_JWT_SECRET: string;

  @IsOptional()
  SSO_JWT_ISSUER = 'foot-sso';

  @IsOptional()
  SSO_COOKIE_NAME = 'foot_sso_session';

  @IsOptional()
  SSO_URL?: string;

  @IsNotEmpty({ message: 'SERVICE_API_KEYS is required' })
  SERVICE_API_KEYS: string;

  @IsOptional()
  SERVICE_API_KEYS_PREVIOUS?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'SERVICE_API_KEYS_PREVIOUS_EXPIRES_AT must be an ISO 8601 date' })
  SERVICE_API_KEYS_PREVIOUS_EXPIRES_AT?: string;

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

  @IsOptional()
  DIRECTORY_DB_HOST?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  DIRECTORY_DB_PORT = 3306;

  @IsOptional()
  DIRECTORY_DB_USERNAME?: string;

  @IsOptional()
  DIRECTORY_DB_PASSWORD?: string;

  @IsOptional()
  DIRECTORY_DB_DATABASE?: string;

  @IsOptional()
  REDIS_HOST = 'localhost';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  REDIS_PORT = 6379;

  @IsOptional()
  REDIS_PASSWORD?: string;

  @IsOptional()
  @IsIn(['smtp', 'resend', 'sendgrid'])
  EMAIL_PROVIDER = 'smtp';

  @IsOptional()
  SMTP_HOST?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  SMTP_PORT = 587;

  @IsOptional()
  SMTP_USER?: string;

  @IsOptional()
  SMTP_PASSWORD?: string;

  @IsOptional()
  SMTP_FROM = 'no-reply@foot.tn';

  @IsOptional()
  RESEND_API_KEY?: string;

  @IsOptional()
  SENDGRID_API_KEY?: string;

  @IsOptional()
  WEB_PUSH_PUBLIC_KEY?: string;

  @IsOptional()
  WEB_PUSH_PRIVATE_KEY?: string;

  @IsOptional()
  WEB_PUSH_CONTACT_EMAIL = 'mailto:contact@foot.tn';

  @IsOptional()
  FCM_PROJECT_ID?: string;

  @IsOptional()
  FCM_CLIENT_EMAIL?: string;

  @IsOptional()
  FCM_PRIVATE_KEY?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  NOTIFICATION_RETENTION_DAYS = 180;
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
