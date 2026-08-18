import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateRefundManualReviewPolicyDto } from './dto/update-refund-manual-review-policy.dto';
import { RefundManualReviewPolicy } from './entities/refund-manual-review-policy.entity';

export interface EffectiveRefundManualReviewPolicy {
  consumerApplication: string;
  slaMinutes: number;
  reminderBeforeDueMinutes: number;
  escalationAfterDueMinutes: number;
  version: number;
  source: 'DEFAULT' | 'PERSISTED';
}

const DEFAULT_POLICY: Omit<
  EffectiveRefundManualReviewPolicy,
  'consumerApplication'
> = {
  slaMinutes: 1440,
  reminderBeforeDueMinutes: 240,
  escalationAfterDueMinutes: 60,
  version: 0,
  source: 'DEFAULT',
};

@Injectable()
export class RefundManualReviewPolicyService {
  constructor(
    @InjectRepository(RefundManualReviewPolicy)
    private readonly repository: Repository<RefundManualReviewPolicy>,
  ) {}

  async getEffectivePolicy(
    consumerApplication: string,
  ): Promise<EffectiveRefundManualReviewPolicy> {
    this.assertConsumerApplication(consumerApplication);
    const policy = await this.repository.findOne({
      where: { consumerApplication },
    });
    if (!policy) return { consumerApplication, ...DEFAULT_POLICY };
    return {
      consumerApplication: policy.consumerApplication,
      slaMinutes: policy.slaMinutes,
      reminderBeforeDueMinutes: policy.reminderBeforeDueMinutes,
      escalationAfterDueMinutes: policy.escalationAfterDueMinutes,
      version: policy.version,
      source: 'PERSISTED',
    };
  }

  async updatePolicy(
    consumerApplication: string,
    dto: UpdateRefundManualReviewPolicyDto,
    updatedByApplication: string,
    updatedByUser: string,
  ): Promise<RefundManualReviewPolicy> {
    this.assertConsumerApplication(consumerApplication);
    if (dto.reminderBeforeDueMinutes >= dto.slaMinutes) {
      throw new BadRequestException(
        'reminderBeforeDueMinutes must be lower than slaMinutes.',
      );
    }

    const existing = await this.repository.findOne({
      where: { consumerApplication },
    });
    const policy = this.repository.create({
      ...(existing ?? {}),
      consumerApplication,
      slaMinutes: dto.slaMinutes,
      reminderBeforeDueMinutes: dto.reminderBeforeDueMinutes,
      escalationAfterDueMinutes: dto.escalationAfterDueMinutes,
      version: (existing?.version ?? 0) + 1,
      updatedByApplication,
      updatedByUser,
    });
    return this.repository.save(policy);
  }

  private assertConsumerApplication(value: string): void {
    if (!/^[a-z0-9][a-z0-9-]{0,99}$/.test(value)) {
      throw new BadRequestException('Invalid consumer application.');
    }
  }
}
