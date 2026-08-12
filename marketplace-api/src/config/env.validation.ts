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
  PORT = 3011;

  // --- Auth vendeur (comptes sp_seller_users -> marketplace_seller_users) ---
  @IsNotEmpty({ message: 'SELLER_JWT_SECRET is required' })
  SELLER_JWT_SECRET: string;

  // --- Service-to-service (applications internes autorisées à appeler les
  // endpoints réservés au club : modération, catégories, ...) ---
  // JSON: {"teamManager":"clé1","superadmin":"clé2", ...}
  @IsNotEmpty({ message: 'SERVICE_API_KEYS is required' })
  SERVICE_API_KEYS: string;

  // --- Database (dédiée marketplace-api, jamais la base partagée `foot`) ---
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
