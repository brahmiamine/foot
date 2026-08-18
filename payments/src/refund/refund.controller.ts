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
import { OperatorRefundDecisionDto } from './dto/operator-refund-decision.dto';
import { Refund } from './entities/refund.entity';
import { RefundStatusHistory } from './entities/refund-status-history.entity';
import { RefundStatus } from './enums/refund-status.enum';
import { RefundOperatorGuard } from './guards/refund-operator.guard';
import { RefundService } from './refund.service';
import { ListRefundsQueryDto } from './dto/list-refunds-query.dto';

function requireOperatorUserId(value: string | undefined): string {
  const operatorUserId = value?.trim();
  if (!operatorUserId || operatorUserId.length > 100) {
    throw new BadRequestException(
      'Missing or invalid x-operator-user-id header',
    );
  }
  return operatorUserId;
}

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

  @Post(':id/approve')
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-operator-user-id') operatorUserHeader?: string,
  ): Promise<Refund> {
    return this.refundService.approveRefund(
      id,
      requireOperatorUserId(operatorUserHeader),
    );
  }

  @Post(':id/reject-approval')
  async rejectApproval(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OperatorRefundDecisionDto,
    @Headers('x-operator-user-id') operatorUserHeader?: string,
  ): Promise<Refund> {
    return this.refundService.rejectApproval(id, {
      note: dto.note,
      resolvedByUser: requireOperatorUserId(operatorUserHeader),
    });
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
    @Body() dto: OperatorRefundDecisionDto,
    @Headers('x-operator-user-id') operatorUserHeader?: string,
  ): Promise<Refund> {
    return this.refundService.confirmManualRefund(id, {
      note: dto.note,
      resolvedByUser: requireOperatorUserId(operatorUserHeader),
    });
  }

  @Post(':id/reject')
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OperatorRefundDecisionDto,
    @Headers('x-operator-user-id') operatorUserHeader?: string,
  ): Promise<Refund> {
    return this.refundService.rejectManualRefund(id, {
      note: dto.note,
      resolvedByUser: requireOperatorUserId(operatorUserHeader),
    });
  }
}
