import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface InternalNotificationPayload {
  eventId?: string;
  type: string;
  email?: string;
  recipientName?: string;
  teamId?: string;
  target?: { type: 'ROLE'; role: string; teamId: string };
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channels?: Array<'IN_APP' | 'EMAIL' | 'PUSH'>;
  expiresAt?: string;
}

@Injectable()
export class CentralNotificationsClient {
  private readonly logger = new Logger(CentralNotificationsClient.name);
  constructor(private readonly config: ConfigService) {}

  private async dispatch(payload: InternalNotificationPayload): Promise<void> {
    const baseUrl = this.config.get<string>('NOTIFICATION_API_URL');
    const apiKey = this.config.get<string>('NOTIFICATION_API_KEY');
    if (!baseUrl || !apiKey) {
      this.logger.warn(
        `Notification ${payload.type} skipped: notifications service is not configured`,
      );
      return;
    }
    try {
      const response = await fetch(
        `${baseUrl.replace(/\/$/, '')}/internal/notifications`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-api-key': apiKey },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(5000),
        },
      );
      if (!response.ok)
        this.logger.warn(
          `Notification ${payload.type} failed with HTTP ${response.status}`,
        );
    } catch (error) {
      this.logger.warn(
        `Notification ${payload.type} failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  notifyClubAdmins(
    clubId: string,
    type: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
    eventId?: string,
  ): Promise<void> {
    return this.dispatch({
      eventId,
      type,
      teamId: clubId,
      target: { type: 'ROLE', role: 'ADMIN', teamId: clubId },
      title,
      body,
      data,
      channels: ['IN_APP', 'EMAIL', 'PUSH'],
    });
  }

  notifyExternalEmail(
    email: string,
    recipientName: string,
    clubId: string,
    type: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
    eventId?: string,
    expiresAt?: string,
  ): Promise<void> {
    return this.dispatch({
      eventId,
      type,
      email,
      recipientName,
      teamId: clubId,
      title,
      body,
      data,
      channels: ['EMAIL'],
      expiresAt,
    });
  }
}
