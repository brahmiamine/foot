import {
  IsIn,
  IsInt,
  IsISO8601,
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

  @IsNotEmpty()
  @IsUrl(
    { require_tld: false },
    { message: 'PAYMEE_BASE_URL must be a valid HTTPS URL' },
  )
  PAYMEE_BASE_URL: string;

  @IsNotEmpty({ message: 'PAYMEE_API_KEY is required' })
  PAYMEE_API_KEY: string;

  @IsNotEmpty()
  @IsUrl(
    { require_tld: false },
    { message: 'PAYMEE_WEBHOOK_URL must be a valid HTTPS URL' },
  )
  PAYMEE_WEBHOOK_URL: string;

  @IsNotEmpty()
  @IsUrl(
    { require_tld: false },
    { message: 'PAYMEE_RETURN_URL must be a valid HTTPS URL' },
  )
  PAYMEE_RETURN_URL: string;

  @IsNotEmpty()
  @IsUrl(
    { require_tld: false },
    { message: 'PAYMEE_CANCEL_URL must be a valid HTTPS URL' },
  )
  PAYMEE_CANCEL_URL: string;

  @IsNotEmpty()
  @IsUrl(
    { require_tld: false },
    { message: 'FLOUCI_BASE_URL must be a valid HTTPS URL' },
  )
  FLOUCI_BASE_URL: string;

  @IsNotEmpty({ message: 'FLOUCI_PUBLIC_KEY is required' })
  FLOUCI_PUBLIC_KEY: string;

  @IsNotEmpty({ message: 'FLOUCI_PRIVATE_KEY is required' })
  FLOUCI_PRIVATE_KEY: string;

  @IsNotEmpty()
  @IsUrl(
    { require_tld: false },
    { message: 'FLOUCI_WEBHOOK_URL must be a valid HTTPS URL' },
  )
  FLOUCI_WEBHOOK_URL: string;

  @IsNotEmpty()
  @IsUrl(
    { require_tld: false },
    { message: 'FLOUCI_SUCCESS_URL must be a valid HTTPS URL' },
  )
  FLOUCI_SUCCESS_URL: string;

  @IsNotEmpty()
  @IsUrl(
    { require_tld: false },
    { message: 'FLOUCI_FAIL_URL must be a valid HTTPS URL' },
  )
  FLOUCI_FAIL_URL: string;

  @IsNotEmpty({ message: 'SERVICE_API_KEYS is required' })
  SERVICE_API_KEYS: string;

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
  const hasExpiry = Boolean(
    config.SERVICE_API_KEYS_PREVIOUS_EXPIRES_AT?.trim(),
  );
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
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });
  if (errors.length > 0) {
    const messages = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Invalid environment configuration: ${messages}`);
  }
  validateRotationPair(validatedConfig);
  return validatedConfig;
}
