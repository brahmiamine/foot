import {
  IsIn,
  IsInt,
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

  // --- SSO (JWT partagé) ---
  @IsNotEmpty({ message: 'SSO_JWT_SECRET is required' })
  SSO_JWT_SECRET: string;

  @IsOptional()
  SSO_JWT_ISSUER = 'foot-sso';

  @IsOptional()
  SSO_COOKIE_NAME = 'foot_sso_session';

  // --- Service-to-service (applications internes) ---
  // JSON: {"teamManager":"clé1","payment-api":"clé2", ...}
  @IsNotEmpty({ message: 'SERVICE_API_KEYS is required' })
  SERVICE_API_KEYS: string;

  // --- Database (notification-api, données propres) ---
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

  // --- Shared directory database (lecture seule, base `foot`) ---
  // Permet de résoudre les cibles broadcast (TEAM/ROLE/CATEGORY/MEMBERS) et
  // le branding club sans dupliquer l'annuaire utilisateurs (voir §5, §22,
  // §34). Optionnel : en son absence, seules les cibles USER explicites
  // fonctionnent et le branding retombe sur les valeurs par défaut.
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

  // --- Redis / Queue (BullMQ) ---
  @IsOptional()
  REDIS_HOST = 'localhost';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  REDIS_PORT = 6379;

  @IsOptional()
  REDIS_PASSWORD?: string;

  // --- Email (SMTP) ---
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

  // --- Push (Web Push / FCM) ---
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

  // --- SMS (TunisieSMS) ---
  @IsOptional()
  @IsIn(['none', 'tunisiesms'])
  SMS_PROVIDER = 'none';

  @IsOptional()
  TUNISIESMS_API_URL?: string;

  @IsOptional()
  TUNISIESMS_ID?: string;

  @IsOptional()
  TUNISIESMS_API_KEY?: string;

  @IsOptional()
  TUNISIESMS_SENDER?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  TUNISIESMS_TIMEOUT_MS = 10_000;

  // --- Rétention / nettoyage ---
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  NOTIFICATION_RETENTION_DAYS = 180;
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
