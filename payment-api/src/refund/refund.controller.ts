import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ServiceAuthGuard } from '../auth/guards/service-auth.guard';
import { RefundService } from './refund.service';
import { Refund } from './entities/refund.entity';
import { RefundStatusHistory } from './entities/refund-status-history.entity';
import { ResolveRefundDto } from './dto/resolve-refund.dto';
import { ListRefundsQueryDto } from './dto/list-refunds-query.dto';
import { RefundStatus } from './enums/refund-status.enum';

/**
 * TASK-P0-001 (todo.md): refund lookup and operator reconciliation
 * ("écran/API de réconciliation opérateur"). Reserved to backend
 * applications — an operator UI (e.g. superadmin) calls through here with
 * its own service API key, passing the acting operator's identity in the
 * request body (payment-api has no end-user session of its own).
 */
@Controller('refunds')
@UseGuards(ServiceAuthGuard)
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  /**
   * Operator queue, e.g. GET /refunds?status=MANUAL_REVIEW. Defaults to the
   * MANUAL_REVIEW queue (this endpoint's primary purpose) rather than every
   * refund in the system — pass `status` explicitly for any other status.
   */
  @Get()
  async list(@Query() query: ListRefundsQueryDto): Promise<Refund[]> {
    return this.refundService.listByStatus(
      query.status ?? RefundStatus.MANUAL_REVIEW,
    );
  }

  @Get(':id')
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ refund: Refund; history: RefundStatusHistory[] }> {
    const refund = await this.refundService.findById(id);
    const history = await this.refundService.getHistory(id);
    return { refund, history };
  }

  /** Re-attempts a FAILED automated refund (Flouci). */
  @Post(':id/retry')
  async retry(@Param('id', ParseUUIDPipe) id: string): Promise<Refund> {
    return this.refundService.retryRefund(id);
  }

  /** Operator confirms a MANUAL_REVIEW refund was actually paid out (e.g. manual bank transfer). */
  @Post(':id/confirm')
  async confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveRefundDto,
  ): Promise<Refund> {
    return this.refundService.confirmManualRefund(id, dto);
  }

  /** Operator rejects a MANUAL_REVIEW refund: it will not be paid out. */
  @Post(':id/reject')
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveRefundDto,
  ): Promise<Refund> {
    return this.refundService.rejectManualRefund(id, dto);
  }
}
