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

  // --- SSO (JWT partagé) ---
  @IsNotEmpty({ message: 'SSO_JWT_SECRET is required' })
  SSO_JWT_SECRET: string;

  @IsOptional()
  SSO_JWT_ISSUER = 'foot-sso';

  @IsOptional()
  SSO_COOKIE_NAME = 'foot_sso_session';

  // URL de `sso`, pour vérifier la révocation (tokenVersion) auprès de
  // GET /api/session/introspect en plus de la signature/expiration locale
  // (voir SsoJwtService.verify) — voir avancement.md, "Propagation de la
  // révocation de session". Optionnel : en son absence, la vérification
  // reste signature/expiration seule, comme avant.
  @IsOptional()
  SSO_URL?: string;

  // --- Service-to-service (applications internes) ---
  // JSON: {"teamManager":"clé1","payment-api":"clé2", ...}
  @IsNotEmpty({ message: 'SERVICE_API_KEYS is required' })
  SERVICE_API_KEYS: string;

  // TASK-P0-003 : rotation sans interruption — clé précédente encore
  // acceptée en parallèle (même format JSON que SERVICE_API_KEYS) jusqu'à
  // SERVICE_API_KEYS_PREVIOUS_EXPIRES_AT. Les deux sont optionnels : leur
  // absence dégrade simplement vers l'acceptation de la seule clé courante.
  @IsOptional()
  SERVICE_API_KEYS_PREVIOUS?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'SERVICE_API_KEYS_PREVIOUS_EXPIRES_AT must be an ISO 8601 date' })
  SERVICE_API_KEYS_PREVIOUS_EXPIRES_AT?: string;

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
