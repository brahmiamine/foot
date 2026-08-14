import { Controller, Get } from '@nestjs/common';
import { OutboxService } from './outbox.service';

/**
 * TASK-P0-006 (todo.md): exposes outbox depth so ops can tell a stuck
 * worker (pending piling up) from provider/webhook outages (dlq piling
 * up) without querying the DB directly. Unauthenticated, same as
 * AppController's `/health` — an infra probe, not an API.
 */
@Controller('health/outbox')
export class OutboxHealthController {
  constructor(private readonly outboxService: OutboxService) {}

  @Get()
  async check() {
    const stats = await this.outboxService.getStats();
    return {
      status: stats.dlq > 0 ? 'degraded' : 'ok',
      ...stats,
      timestamp: new Date().toISOString(),
    };
  }
}
