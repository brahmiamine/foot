export interface SmsMessage {
  to: string;
  body: string;
  /** Expéditeur personnalisé, si autorisé par le provider (§ Expéditeur / Sender). Sinon, le provider retombe sur son sender par défaut. */
  sender?: string;
}

/** Réponse normalisée, indépendante du format du provider (voir tunisiesms/tunisiesms.mapper.ts pour le mapping TunisieSMS). */
export interface SmsSendResult {
  success: boolean;
  providerMessageId?: string;
  providerStatus?: string;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Accusé de réception opérateur (DLR) — préparé pour une intégration future
 * (§ Accusés de réception / DLR), non câblé à un endpoint pour l'instant :
 * aucun mécanisme DLR fictif n'est simulé nulle part dans ce provider.
 */
export interface SmsDeliveryResult {
  providerMessageId: string;
  status: 'DELIVERED' | 'FAILED';
  deliveredAt?: Date;
}

export const SMS_PROVIDER = Symbol('SMS_PROVIDER');

/**
 * Abstraction fournisseur SMS. Respectée par tout nouveau provider (ex:
 * Twilio demain) sans changer SmsChannel ni le reste de l'architecture.
 */
export interface SmsProvider {
  readonly name: string;
  send(message: SmsMessage): Promise<SmsSendResult>;
}
