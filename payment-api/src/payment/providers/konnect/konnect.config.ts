import { registerAs } from '@nestjs/config';

export interface KonnectConfig {
  baseUrl: string;
  apiKey: string;
  walletId: string;
  webhookUrl: string;
}

export const konnectConfig = registerAs('konnect', (): KonnectConfig => ({
  baseUrl: (process.env.KONNECT_BASE_URL ?? '').replace(/\/+$/, ''),
  apiKey: process.env.KONNECT_API_KEY ?? '',
  walletId: process.env.KONNECT_WALLET_ID ?? '',
  webhookUrl: process.env.KONNECT_WEBHOOK_URL ?? '',
}));
