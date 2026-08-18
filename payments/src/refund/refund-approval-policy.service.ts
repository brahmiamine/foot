import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateRefundApprovalPolicyDto } from './dto/update-refund-approval-policy.dto';
import { RefundApprovalPolicy } from './entities/refund-approval-policy.entity';
import { RefundApprovalMode } from './enums/refund-approval-mode.enum';

export interface EffectiveRefundApprovalPolicy {
  consumerApplication: string;
  autoMaxAmount: string | null;
  dualApprovalMinAmount: string | null;
  makerCheckerEnabled: boolean;
  version: number;
  source: 'DEFAULT' | 'PERSISTED';
}

@Injectable()
export class RefundApprovalPolicyService {
  constructor(
    @InjectRepository(RefundApprovalPolicy)
    private readonly repository: Repository<RefundApprovalPolicy>,
  ) {}

  async getEffectivePolicy(
    consumerApplication: string,
  ): Promise<EffectiveRefundApprovalPolicy> {
    this.assertConsumerApplication(consumerApplication);
    const policy = await this.repository.findOne({
      where: { consumerApplication },
    });
    if (!policy) {
      return {
        consumerApplication,
        autoMaxAmount: null,
        dualApprovalMinAmount: null,
        makerCheckerEnabled: true,
        version: 0,
        source: 'DEFAULT',
      };
    }
    return {
      consumerApplication: policy.consumerApplication,
      autoMaxAmount: policy.autoMaxAmount,
      dualApprovalMinAmount: policy.dualApprovalMinAmount,
      makerCheckerEnabled: policy.makerCheckerEnabled,
      version: policy.version,
      source: 'PERSISTED',
    };
  }

  resolveMode(
    policy: EffectiveRefundApprovalPolicy,
    amount: number,
  ): RefundApprovalMode {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Refund amount must be positive.');
    }
    const autoMax =
      policy.autoMaxAmount === null ? null : Number(policy.autoMaxAmount);
    const dualMin =
      policy.dualApprovalMinAmount === null
        ? null
        : Number(policy.dualApprovalMinAmount);

    if (autoMax !== null && amount <= autoMax) {
      return RefundApprovalMode.AUTO;
    }
    if (dualMin !== null && amount >= dualMin) {
      return RefundApprovalMode.DUAL_APPROVAL;
    }
    return RefundApprovalMode.SINGLE_APPROVAL;
  }

  async updatePolicy(
    consumerApplication: string,
    dto: UpdateRefundApprovalPolicyDto,
    updatedByApplication: string,
  ): Promise<RefundApprovalPolicy> {
    this.assertConsumerApplication(consumerApplication);
    const autoMax = dto.autoMaxAmount ?? null;
    const dualMin = dto.dualApprovalMinAmount ?? null;
    if (autoMax !== null && dualMin !== null && dualMin <= autoMax) {
      throw new BadRequestException(
        'dualApprovalMinAmount must be greater than autoMaxAmount.',
      );
    }

    const existing = await this.repository.findOne({
      where: { consumerApplication },
    });
    const policy = this.repository.create({
      ...(existing ?? {}),
      consumerApplication,
      autoMaxAmount: autoMax === null ? null : autoMax.toFixed(3),
      dualApprovalMinAmount: dualMin === null ? null : dualMin.toFixed(3),
      makerCheckerEnabled: dto.makerCheckerEnabled,
      version: (existing?.version ?? 0) + 1,
      updatedByApplication,
    });
    return this.repository.save(policy);
  }

  private assertConsumerApplication(value: string): void {
    if (!/^[a-z0-9][a-z0-9-]{0,99}$/.test(value)) {
      throw new BadRequestException('Invalid consumer application.');
    }
  }
}
