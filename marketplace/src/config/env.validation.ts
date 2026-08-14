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

  // --- Auth vendeur (comptes sp_seller_users -> marketplace_seller_users) ---
  @IsNotEmpty({ message: 'SELLER_JWT_SECRET is required' })
  SELLER_JWT_SECRET: string;

  // --- Service-to-service (applications internes autorisées à appeler les
  // endpoints réservés au club : modération, catégories, ...) ---
  // JSON: {"club-hub":"clé1","federation-hub":"clé2", ...}
  @IsNotEmpty({ message: 'SERVICE_API_KEYS is required' })
  SERVICE_API_KEYS: string;

  // TASK-P0-003 : rotation sans interruption — clé précédente encore
  // acceptée en parallèle (même format JSON que SERVICE_API_KEYS) jusqu'à
  // SERVICE_API_KEYS_PREVIOUS_EXPIRES_AT. Les deux sont optionnels : leur
  // absence dégrade simplement vers l'acceptation de la seule clé courante.
  @IsOptional()
  SERVICE_API_KEYS_PREVIOUS?: string;

  @IsOptional()
  @IsISO8601(
    {},
    {
      message: 'SERVICE_API_KEYS_PREVIOUS_EXPIRES_AT must be an ISO 8601 date',
    },
  )
  SERVICE_API_KEYS_PREVIOUS_EXPIRES_AT?: string;

  // --- payments (TASK-P0-004) : optionnelles — sans elles, le service
  // démarre mais le checkout échoue explicitement (ServiceUnavailableException,
  // voir PaymentApiClientService), même dégradation que NOTIFICATION_API_URL
  // ci-dessous plutôt qu'un crash au démarrage. ---
  @IsOptional()
  PAYMENT_API_URL?: string;

  @IsOptional()
  PAYMENT_API_KEY?: string;

  @IsOptional()
  @IsIn(['konnect', 'flouci', 'paymee'])
  PAYMENT_PROVIDER?: string;

  // Signe les webhooks entrants de payments (voir CheckoutController) —
  // sans secret configuré, la route rejette tout webhook (fail-closed).
  @IsOptional()
  PAYMENT_WEBHOOK_SECRET?: string;

  // --- notifications (optionnelle) : si absente, une commande confirmée
  // ne notifie simplement pas le membre (aucune erreur, voir
  // NotificationApiClientService). ---
  @IsOptional()
  NOTIFICATION_API_URL?: string;

  @IsOptional()
  NOTIFICATION_API_KEY?: string;

  // --- Database (dédiée marketplace, jamais la base partagée `foot`) ---
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
