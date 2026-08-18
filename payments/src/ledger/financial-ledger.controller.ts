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
import { CurrentService } from '../auth/decorators/current-service.decorator';
import { ServiceAuthGuard } from '../auth/guards/service-auth.guard';
import type { AuthenticatedService } from '../auth/interfaces/authenticated-service.interface';
import { ListFinancialLedgerQueryDto } from './dto/list-financial-ledger-query.dto';
import { RecordFinancialSettlementDto } from './dto/record-financial-settlement.dto';
import { RegisterPaymentFinancialAllocationDto } from './dto/register-payment-financial-allocation.dto';
import { FinancialOperatorGuard } from './guards/financial-operator.guard';
import { SettlementWriterGuard } from './guards/settlement-writer.guard';
import { FinancialLedgerService } from './financial-ledger.service';

@Controller('financial-ledger')
@UseGuards(ServiceAuthGuard)
export class FinancialLedgerController {
  constructor(private readonly ledgerService: FinancialLedgerService) {}

  @Post('payments/:paymentId/allocations')
  registerAllocation(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Body() dto: RegisterPaymentFinancialAllocationDto,
    @CurrentService() service: AuthenticatedService,
  ) {
    return this.ledgerService.registerPaymentAllocation(
      paymentId,
      dto,
      service.application,
    );
  }

  @Get('payments/:paymentId')
  getPaymentLedger(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @CurrentService() service: AuthenticatedService,
  ) {
    return this.ledgerService.getPaymentLedgerForApplication(
      paymentId,
      service.application,
    );
  }

  @Post('settlements')
  @UseGuards(SettlementWriterGuard)
  recordSettlement(
    @Body() dto: RecordFinancialSettlementDto,
    @CurrentService() service: AuthenticatedService,
  ) {
    return this.ledgerService.recordSettlement(dto, service.application);
  }

  @Get('summary')
  @UseGuards(FinancialOperatorGuard)
  getSummary(@Query() query: ListFinancialLedgerQueryDto) {
    return this.ledgerService.getOperatorSummaries(query);
  }

  @Get()
  @UseGuards(FinancialOperatorGuard)
  list(@Query() query: ListFinancialLedgerQueryDto) {
    return this.ledgerService.listOperatorEntries(query);
  }
}
