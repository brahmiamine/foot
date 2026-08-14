import { Injectable, Logger } from '@nestjs/common';

export interface NotifyMemberPayload {
  eventId?: string;
  type: string;
  userId: string;
  category?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * TASK-P0-004 (todo.md). Client best-effort vers notifications's
 * POST /internal/notifications, pour notifier le MEMBRE acheteur (le
 * `NotificationsService` local de ce dépôt ne notifie que les vendeurs,
 * voir notifications/notifications.service.ts). Même contrat que
 * payments/src/notifications/notification-client.service.ts : ne lève
 * jamais — une confirmation de commande ne doit jamais échouer parce que
 * notifications est indisponible ou non configuré.
 */
@Injectable()
export class NotificationApiClientService {
  private readonly logger = new Logger(NotificationApiClientService.name);

  async notify(payload: NotifyMemberPayload): Promise<void> {
    const baseUrl = process.env.NOTIFICATION_API_URL;
    const apiKey = process.env.NOTIFICATION_API_KEY;
    if (!baseUrl || !apiKey) return;

    try {
      const response = await fetch(
        `${baseUrl.replace(/\/$/, '')}/internal/notifications`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        this.logger.error(
          `notifications rejected type=${payload.type}: ${response.status} ${text}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to reach notifications for type=${payload.type}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
