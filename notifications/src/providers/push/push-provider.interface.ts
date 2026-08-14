import { PushSubscription } from '../../push-subscriptions/entities/push-subscription.entity';

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
}

/** Abonnement définitivement invalide côté provider (410 Gone, token désinstallé, …). */
export class InvalidPushSubscriptionError extends Error {}

export const PUSH_PROVIDER = Symbol('PUSH_PROVIDER');

export interface PushProvider {
  readonly name: string;
  supports(subscription: PushSubscription): boolean;
  send(subscription: PushSubscription, message: PushMessage): Promise<void>;
}
