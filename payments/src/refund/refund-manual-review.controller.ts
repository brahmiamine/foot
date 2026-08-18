import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentService } from '../auth/decorators/current-service.decorator';
import { ServiceAuthGuard } from '../auth/guards/service-auth.guard';
import type { AuthenticatedService } from '../auth/interfaces/authenticated-service.interface';
import { UpdateRefundManualReviewPolicyDto } from './dto/update-refund-manual-review-policy.dto';
import { RefundManualReviewPolicy } from './entities/refund-manual-review-policy.entity';
import { RefundOperatorGuard } from './guards/refund-operator.guard';
import {
  EffectiveRefundManualReviewPolicy,
  RefundManualReviewPolicyService,
} from './refund-manual-review-policy.service';
import {
  ManualReviewDashboard,
  RefundManualReviewSlaService,
} from './refund-manual-review-sla.service';

function requireOperatorUserId(value: string | undefined): string {
  const userId = value?.trim();
  if (!userId || userId.length > 100) {
    throw new BadRequestException(
      'Missing or invalid x-operator-user-id header',
    );
  }
  return userId;
}

@Controller('refund-manual-review')
@UseGuards(ServiceAuthGuard, RefundOperatorGuard)
export class RefundManualReviewController {
  constructor(
    private readonly slaService: RefundManualReviewSlaService,
    private readonly policyService: RefundManualReviewPolicyService,
  ) {}

  @Get('dashboard')
  dashboard(): Promise<ManualReviewDashboard> {
    return this.slaService.getDashboard();
  }

  @Get('policies/:consumerApplication')
  getPolicy(
    @Param('consumerApplication') consumerApplication: string,
  ): Promise<EffectiveRefundManualReviewPolicy> {
    return this.policyService.getEffectivePolicy(consumerApplication);
  }

  @Put('policies/:consumerApplication')
  async updatePolicy(
    @Param('consumerApplication') consumerApplication: string,
    @Body() dto: UpdateRefundManualReviewPolicyDto,
    @CurrentService() service: AuthenticatedService,
    @Headers('x-operator-user-id') operatorUserHeader?: string,
  ): Promise<RefundManualReviewPolicy> {
    // Snapshot every currently-open cycle before changing the policy so an
    // operator update cannot move an already-open manual-review deadline.
    await this.slaService.initializeSchedules();
    return this.policyService.updatePolicy(
      consumerApplication,
      dto,
      service.application,
      requireOperatorUserId(operatorUserHeader),
    );
  }
}
