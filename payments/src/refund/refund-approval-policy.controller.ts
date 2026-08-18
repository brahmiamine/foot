import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { CurrentService } from '../auth/decorators/current-service.decorator';
import { ServiceAuthGuard } from '../auth/guards/service-auth.guard';
import type { AuthenticatedService } from '../auth/interfaces/authenticated-service.interface';
import { UpdateRefundApprovalPolicyDto } from './dto/update-refund-approval-policy.dto';
import { RefundApprovalPolicy } from './entities/refund-approval-policy.entity';
import { RefundOperatorGuard } from './guards/refund-operator.guard';
import {
  EffectiveRefundApprovalPolicy,
  RefundApprovalPolicyService,
} from './refund-approval-policy.service';

@Controller('refund-policies')
@UseGuards(ServiceAuthGuard, RefundOperatorGuard)
export class RefundApprovalPolicyController {
  constructor(private readonly policyService: RefundApprovalPolicyService) {}

  @Get(':consumerApplication')
  getPolicy(
    @Param('consumerApplication') consumerApplication: string,
  ): Promise<EffectiveRefundApprovalPolicy> {
    return this.policyService.getEffectivePolicy(consumerApplication);
  }

  @Put(':consumerApplication')
  updatePolicy(
    @Param('consumerApplication') consumerApplication: string,
    @Body() dto: UpdateRefundApprovalPolicyDto,
    @CurrentService() service: AuthenticatedService,
  ): Promise<RefundApprovalPolicy> {
    return this.policyService.updatePolicy(
      consumerApplication,
      dto,
      service.application,
    );
  }
}
