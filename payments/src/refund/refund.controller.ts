import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
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
import { RefundOperatorGuard } from './guards/refund-operator.guard';

function requireOperatorUserId(value: string | undefined): string {
  const operatorUserId = value?.trim();
  if (!operatorUserId || operatorUserId.length > 100) {
    throw new BadRequestException('Missing or invalid x-operator-user-id header');
  }
  return operatorUserId;
}

/**
 * File de réconciliation opérateur. Contrairement aux routes
 * /payments/:paymentId/refunds, elle donne une vision globale et peut
 * confirmer/rejeter des mouvements financiers : elle est donc réservée à
 * federation-hub après authentification service-à-service.
 */
@Controller('refunds')
@UseGuards(ServiceAuthGuard, RefundOperatorGuard)
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

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

  @Post(':id/retry')
  async retry(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-operator-user-id') operatorUserHeader?: string,
  ): Promise<Refund> {
    requireOperatorUserId(operatorUserHeader);
    return this.refundService.retryRefund(id);
  }

  @Post(':id/confirm')
  async confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveRefundDto,
    @Headers('x-operator-user-id') operatorUserHeader?: string,
  ): Promise<Refund> {
    const operatorUserId = requireOperatorUserId(operatorUserHeader);
    return this.refundService.confirmManualRefund(id, {
      ...dto,
      resolvedByUser: operatorUserId,
    });
  }

  @Post(':id/reject')
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveRefundDto,
    @Headers('x-operator-user-id') operatorUserHeader?: string,
  ): Promise<Refund> {
    const operatorUserId = requireOperatorUserId(operatorUserHeader);
    return this.refundService.rejectManualRefund(id, {
      ...dto,
      resolvedByUser: operatorUserId,
    });
  }
}
