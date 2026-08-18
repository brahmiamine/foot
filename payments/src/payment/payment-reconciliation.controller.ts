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
import { CurrentService } from '../auth/decorators/current-service.decorator';
import { ServiceAuthGuard } from '../auth/guards/service-auth.guard';
import type { AuthenticatedService } from '../auth/interfaces/authenticated-service.interface';
import { ListPaymentReconciliationCasesQueryDto } from './dto/list-payment-reconciliation-cases-query.dto';
import { ResolvePaymentReconciliationCaseDto } from './dto/resolve-payment-reconciliation-case.dto';
import { PaymentReconciliationOperatorGuard } from './guards/payment-reconciliation-operator.guard';
import {
  PaymentReconciliationActor,
  PaymentReconciliationService,
} from './payment-reconciliation.service';

function requireOperatorUserId(value: string | undefined): string {
  const operatorUserId = value?.trim();
  if (!operatorUserId || operatorUserId.length > 100) {
    throw new BadRequestException(
      'Missing or invalid x-operator-user-id header',
    );
  }
  return operatorUserId;
}

function actorFromHeaders(
  service: AuthenticatedService,
  operatorUserHeader: string | undefined,
  operatorIpHeader: string | undefined,
  operatorUserAgentHeader: string | undefined,
): PaymentReconciliationActor {
  return {
    application: service.application,
    userId: requireOperatorUserId(operatorUserHeader),
    ipAddress: operatorIpHeader?.trim().slice(0, 64) || null,
    userAgent: operatorUserAgentHeader?.trim().slice(0, 512) || null,
  };
}

@Controller('payment-reconciliation')
@UseGuards(ServiceAuthGuard, PaymentReconciliationOperatorGuard)
export class PaymentReconciliationController {
  constructor(
    private readonly reconciliationService: PaymentReconciliationService,
  ) {}

  @Get('cases')
  listCases(@Query() query: ListPaymentReconciliationCasesQueryDto) {
    return this.reconciliationService.listCases(query);
  }

  @Get('cases/:id')
  getCase(@Param('id', ParseUUIDPipe) id: string) {
    return this.reconciliationService.getCaseBundle(id);
  }

  @Post('scan')
  scan(
    @CurrentService() service: AuthenticatedService,
    @Headers('x-operator-user-id') operatorUserHeader?: string,
    @Headers('x-operator-ip') operatorIpHeader?: string,
    @Headers('x-operator-user-agent') operatorUserAgentHeader?: string,
  ) {
    return this.reconciliationService.reconcileStalePayments(
      actorFromHeaders(
        service,
        operatorUserHeader,
        operatorIpHeader,
        operatorUserAgentHeader,
      ),
    );
  }

  @Post('cases/:id/recheck')
  recheck(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentService() service: AuthenticatedService,
    @Headers('x-operator-user-id') operatorUserHeader?: string,
    @Headers('x-operator-ip') operatorIpHeader?: string,
    @Headers('x-operator-user-agent') operatorUserAgentHeader?: string,
  ) {
    return this.reconciliationService.recheckCase(
      id,
      actorFromHeaders(
        service,
        operatorUserHeader,
        operatorIpHeader,
        operatorUserAgentHeader,
      ),
    );
  }

  @Post('cases/:id/resolve')
  resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolvePaymentReconciliationCaseDto,
    @CurrentService() service: AuthenticatedService,
    @Headers('x-operator-user-id') operatorUserHeader?: string,
    @Headers('x-operator-ip') operatorIpHeader?: string,
    @Headers('x-operator-user-agent') operatorUserAgentHeader?: string,
  ) {
    return this.reconciliationService.resolveCase(
      id,
      dto,
      actorFromHeaders(
        service,
        operatorUserHeader,
        operatorIpHeader,
        operatorUserAgentHeader,
      ),
    );
  }
}
