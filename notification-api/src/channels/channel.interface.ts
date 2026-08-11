import { NotificationChannelType } from '../common/enums/channel.enum';
import { NotificationLocale } from '../common/enums/locale.enum';
import { Notification } from '../notifications/entities/notification.entity';

export interface ChannelRecipient {
  email: string | null;
  name: string | null;
  locale: NotificationLocale;
}

export interface ChannelDeliveryContext {
  notification: Notification;
  recipient: ChannelRecipient;
  branding: { name: string; nameAr: string | null; logoUrl: string | null };
}

export const CHANNEL_REGISTRY = Symbol('CHANNEL_REGISTRY');

/** Métadonnées provider renvoyées par un envoi réussi, conservées dans NotificationDelivery (§25). */
export interface ChannelDeliveryResult {
  providerMessageId?: string;
  providerStatus?: string;
}

/**
 * Contrat commun à tous les canaux (§10). NotificationsService/les
 * processors de queue ne connaissent que cette interface : ajouter un canal
 * (ex: WhatsApp demain) ne modifie ni Notification, ni le reste de
 * l'architecture (§10, §30).
 */
export interface NotificationChannel {
  readonly type: NotificationChannelType;
  /**
   * true si "accepté par le provider" ne veut pas dire "livré" (ex: SMS —
   * TunisieSMS distingue soumission (code 200) et accusé de réception DLR
   * futur). Le worker ne marque alors jamais la delivery DELIVERED
   * automatiquement (voir BaseChannelProcessor). Par défaut false/absent :
   * comportement historique (accepté = livré) pour in-app/email/push.
   */
  readonly deliveryConfirmationRequired?: boolean;
  /** Lance l'envoi. Doit lever en cas d'échec (le worker gère alors le retry, voir queue/). */
  deliver(
    context: ChannelDeliveryContext,
  ): Promise<ChannelDeliveryResult | void>;
}
