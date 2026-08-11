import { registerAs } from '@nestjs/config';

export interface PaymeeConfig {
  baseUrl: string;
  apiKey: string;
  webhookUrl: string;
  returnUrl: string;
  cancelUrl: string;
}

export const paymeeConfig = registerAs('paymee', (): PaymeeConfig => ({
  baseUrl: (process.env.PAYMEE_BASE_URL ?? '').replace(/\/+$/, ''),
  apiKey: process.env.PAYMEE_API_KEY ?? '',
  webhookUrl: process.env.PAYMEE_WEBHOOK_URL ?? '',
  returnUrl: process.env.PAYMEE_RETURN_URL ?? '',
  cancelUrl: process.env.PAYMEE_CANCEL_URL ?? '',
}));
