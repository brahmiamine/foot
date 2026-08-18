import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DigestMode } from '../common/enums/digest-mode.enum';
import { DigestService } from './digest.service';

/** NOTIF-003 : déclenche le flush des fenêtres HOURLY/DAILY closes. */
@Injectable()
export class DigestFlushService {
  constructor(private readonly digest: DigestService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async flushHourly(): Promise<void> {
    await this.digest.flushDue(DigestMode.HOURLY);
  }

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async flushDaily(): Promise<void> {
    await this.digest.flushDue(DigestMode.DAILY);
  }
}
