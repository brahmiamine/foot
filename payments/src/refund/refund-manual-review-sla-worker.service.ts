import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { RefundManualReviewSlaService } from './refund-manual-review-sla.service';

const POLL_INTERVAL_MS = 30_000;

@Injectable()
export class RefundManualReviewSlaWorkerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RefundManualReviewSlaWorkerService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(private readonly slaService: RefundManualReviewSlaService) {}

  onModuleInit(): void {
    void this.tick();
    this.timer = setInterval(() => void this.tick(), POLL_INTERVAL_MS);
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async tick(now = new Date()): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const result = await this.slaService.processDueAlerts(now);
      if (result.reminders || result.escalations || result.errors) {
        this.logger.log(
          `Manual-review SLA: reminders=${result.reminders}, escalations=${result.escalations}, errors=${result.errors}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Manual-review SLA worker failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.running = false;
    }
  }
}
