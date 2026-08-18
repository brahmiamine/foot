import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { notificationClientConfig } from './notification-client.config';

export interface NotifyTarget {
  type: 'USER' | 'TEAM' | 'ROLE' | 'CATEGORY' | 'SELLER' | 'MEMBERS';
  teamId?: string;
  role?: string;
  userIds?: string[];
}

export interface NotifyPayload {
  eventId?: string;
  type: string;
  userId?: string;
  target?: NotifyTarget;
  category?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Client for notifications's POST /internal/notifications (service-to-service,
 * `x-api-key`). `notify` remains best-effort for customer-facing payment
 * events. `notifyRequired` is reserved for operational workflows whose local
 * delivery marker must not advance when notifications is unavailable.
 */
@Injectable()
export class NotificationClientService {
  private readonly logger = new Logger(NotificationClientService.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(notificationClientConfig.KEY)
    private readonly config: ConfigType<typeof notificationClientConfig>,
  ) {}

  async notify(payload: NotifyPayload): Promise<void> {
    if (!this.config.url || !this.config.apiKey) return;
    try {
      await this.post(payload);
    } catch (error) {
      this.logger.error(
        `Failed to reach notifications for type=${payload.type}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async notifyRequired(payload: NotifyPayload): Promise<void> {
    if (!this.config.url || !this.config.apiKey) {
      throw new Error(
        'Notifications service is not configured for required operational delivery.',
      );
    }
    await this.post(payload);
  }

  private async post(payload: NotifyPayload): Promise<void> {
    await firstValueFrom(
      this.httpService.post(
        `${this.config.url!.replace(/\/$/, '')}/internal/notifications`,
        payload,
        {
          timeout: 5000,
          headers: { 'x-api-key': this.config.apiKey! },
        },
      ),
    );
  }
}
