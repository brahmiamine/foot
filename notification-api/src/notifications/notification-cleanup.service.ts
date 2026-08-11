import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';

/**
 * Nettoyage des notifications expirées (`expiresAt` dépassé, §24) et
 * rétention (`NOTIFICATION_RETENTION_DAYS`, §27, §29). Tourne une fois par
 * jour ; volontairement simple (DELETE en base) plutôt qu'un archivage,
 * V1 ne l'exigeant pas.
 */
@Injectable()
export class NotificationCleanupService {
  private readonly logger = new Logger(NotificationCleanupService.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCleanup(): Promise<void> {
    const retentionDays =
      this.config.get<number>('NOTIFICATION_RETENTION_DAYS') ?? 180;
    const deleted =
      await this.notificationsService.deleteExpiredAndStale(retentionDays);
    if (deleted > 0) {
      this.logger.log(`Cleaned up ${deleted} expired/stale notification(s).`);
    }
  }
}
