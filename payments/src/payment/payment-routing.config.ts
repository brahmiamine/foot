import { registerAs } from '@nestjs/config';

export interface PaymentRoutingConfig {
  /**
   * Backend application identities allowed to administer routing policies.
   * Empty by default so a deployment must opt in explicitly.
   */
  adminApplications: string[];
}

export const paymentRoutingConfig = registerAs(
  'paymentRouting',
  (): PaymentRoutingConfig => ({
    adminApplications: (process.env.PAYMENT_ROUTING_ADMIN_APPLICATIONS ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  }),
);
