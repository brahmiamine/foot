import { registerAs } from '@nestjs/config';

export interface FlouciConfig {
  baseUrl: string;
  publicKey: string;
  privateKey: string;
  webhookUrl: string;
  successUrl: string;
  failUrl: string;
}

export const flouciConfig = registerAs('flouci', (): FlouciConfig => ({
  baseUrl: (process.env.FLOUCI_BASE_URL ?? '').replace(/\/+$/, ''),
  publicKey: process.env.FLOUCI_PUBLIC_KEY ?? '',
  privateKey: process.env.FLOUCI_PRIVATE_KEY ?? '',
  webhookUrl: process.env.FLOUCI_WEBHOOK_URL ?? '',
  successUrl: process.env.FLOUCI_SUCCESS_URL ?? '',
  failUrl: process.env.FLOUCI_FAIL_URL ?? '',
}));
