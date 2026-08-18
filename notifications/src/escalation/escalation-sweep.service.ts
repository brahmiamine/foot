import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EscalationService } from './escalation.service';

/** NOTIF-004 : déclenche périodiquement la recherche de notifications critiques en retard. */
@Injectable()
export class EscalationSweepService {
  constructor(private readonly escalation: EscalationService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleSweep(): Promise<void> {
    await this.escalation.sweep();
  }
}
