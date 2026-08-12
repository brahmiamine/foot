import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ServiceAuthGuard } from '../auth/guards/service-auth.guard';
import { PayoutsService } from './payouts.service';
import { FailPayoutDto } from './dto/fail-payout.dto';
import { Payout } from './entities/payout.entity';

/**
 * E15 (US-47 à US-49) — déclenchement et suivi des payouts, réservés aux
 * applications internes (club/plateforme) : un vendeur ne s'auto-déclenche
 * jamais un virement, même pattern que `moderation/products`
 * (ServiceAuthGuard, jamais appelable directement par un navigateur).
 */
@Controller('internal/payouts')
@UseGuards(ServiceAuthGuard)
export class InternalPayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Post()
  async create(@Query('sellerId') sellerId: string): Promise<Payout> {
    return this.payoutsService.create(sellerId);
  }

  /** PENDING -> PROCESSING */
  @Post(':id/processing')
  async markProcessing(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Payout> {
    return this.payoutsService.markProcessing(id);
  }

  /** PROCESSING -> PAID */
  @Post(':id/paid')
  async markPaid(@Param('id', ParseUUIDPipe) id: string): Promise<Payout> {
    return this.payoutsService.markPaid(id);
  }

  /** PROCESSING -> FAILED (motif obligatoire) */
  @Post(':id/failed')
  async markFailed(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FailPayoutDto,
  ): Promise<Payout> {
    return this.payoutsService.markFailed(id, dto.reason);
  }

  /** FAILED -> PENDING (rejoue le virement) */
  @Post(':id/retry')
  async retry(@Param('id', ParseUUIDPipe) id: string): Promise<Payout> {
    return this.payoutsService.retry(id);
  }
}
