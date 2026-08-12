import { NotificationChannelType } from '../common/enums/channel.enum';
import { NotificationLocale } from '../common/enums/locale.enum';
import { Notification } from '../notifications/entities/notification.entity';

export interface ChannelRecipient {
  email: string | null;
  name: string | null;
  /** Non normalisé (voir common/phone-number.ts) : à charge de chaque canal de le normaliser avant envoi. */
  phoneNumber: string | null;
  locale: NotificationLocale;
}

export interface ChannelDeliveryContext {
  notification: Notification;
  recipient: ChannelRecipient;
  branding: { name: string; nameAr: string | null; logoUrl: string | null };
}

export const CHANNEL_REGISTRY = Symbol('CHANNEL_REGISTRY');

/**
 * Contrat commun à tous les canaux (§10). NotificationsService/les
 * processors de queue ne connaissent que cette interface : ajouter un canal
 * (ex: WhatsApp demain) ne modifie ni Notification, ni le reste de
 * l'architecture (§10, §30).
 */
export interface NotificationChannel {
  readonly type: NotificationChannelType;
  /** Lance l'envoi. Doit lever en cas d'échec (le worker gère alors le retry, voir queue/). */
  deliver(context: ChannelDeliveryContext): Promise<void>;
}
