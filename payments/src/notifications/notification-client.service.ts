import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { notificationClientConfig } from './notification-client.config';

export interface NotifyPayload {
  eventId?: string;
  type: string;
  userId?: string;
  category?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Best-effort client for notifications's POST /internal/notifications
 * (service-to-service, `x-api-key`). Never throws: a payment confirmation
 * must never fail because notifications is unreachable or unconfigured.
 * No retry here — notifications itself owns retry/queueing once the
 * request is accepted.
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
    if (!this.config.url || !this.config.apiKey) {
      return;
    }

    try {
      await firstValueFrom(
        this.httpService.post(
          `${this.config.url.replace(/\/$/, '')}/internal/notifications`,
          payload,
          {
            timeout: 5000,
            headers: { 'x-api-key': this.config.apiKey },
          },
        ),
      );
    } catch (error) {
      this.logger.error(
        `Failed to reach notifications for type=${payload.type}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
