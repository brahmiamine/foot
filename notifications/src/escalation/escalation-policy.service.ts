import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import {
  resolvePolicy,
  type PolicyRecord,
} from '../common/domain-contracts/policy';
import { requireConfigurationChangeReason } from '../common/domain-contracts/configuration-audit';
import { NotificationPolicyAudit } from '../policy/entities/notification-policy-audit.entity';
import { NotificationEscalationPolicy } from './entities/notification-escalation-policy.entity';
import type { NotificationPolicyScopeType } from '../policy/entities/notification-policy.entity';

export interface EscalationPolicyValues {
  enabled: boolean;
  delayMinutes: number;
  backupUserId: string | null;
  backupRole: string | null;
}

const DEFAULT_ESCALATION_POLICY: EscalationPolicyValues = {
  enabled: false,
  delayMinutes: 30,
  backupUserId: null,
  backupRole: null,
};

export interface UpsertEscalationPolicyInput {
  scopeType: NotificationPolicyScopeType;
  scopeId: string | null;
  category: string | null;
  enabled: boolean;
  delayMinutes: number;
  backupUserId: string | null;
  backupRole: string | null;
  actorUserId: string;
  actorRole: string;
  reason: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

function toPolicyRecord(
  row: NotificationEscalationPolicy,
): PolicyRecord<EscalationPolicyValues> {
  return {
    id: row.id,
    scopeType: row.scopeType,
    scopeId: row.scopeId,
    version: row.version,
    effectiveFrom: row.effectiveFrom,
    effectiveUntil: row.effectiveUntil,
    values: {
      enabled: row.enabled,
      delayMinutes: row.delayMinutes,
      backupUserId: row.backupUserId,
      backupRole: row.backupRole,
    },
  };
}

@Injectable()
export class EscalationPolicyService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(NotificationEscalationPolicy)
    private readonly repository: Repository<NotificationEscalationPolicy>,
    @InjectRepository(NotificationPolicyAudit)
    private readonly auditRepository: Repository<NotificationPolicyAudit>,
  ) {}

  async resolve(
    teamId: string | null,
    category: string,
    at: Date = new Date(),
  ): Promise<EscalationPolicyValues> {
    const all = await this.repository.find();
    const exact = all.filter((row) => row.category === category);
    const applicable =
      exact.length > 0 ? exact : all.filter((row) => row.category === null);

    const resolved = resolvePolicy(
      DEFAULT_ESCALATION_POLICY,
      applicable.map(toPolicyRecord),
      { clubId: teamId },
      at,
    );
    return resolved.values;
  }

  async findAll(): Promise<NotificationEscalationPolicy[]> {
    return this.repository.find({
      order: { category: 'ASC', scopeType: 'ASC' },
    });
  }

  async upsert(
    input: UpsertEscalationPolicyInput,
  ): Promise<NotificationEscalationPolicy> {
    if (input.scopeType === 'CLUB' && !input.scopeId) {
      throw new Error(
        'scopeId is required for CLUB-scoped escalation policies',
      );
    }
    if (!Number.isInteger(input.delayMinutes) || input.delayMinutes < 1) {
      throw new Error('delayMinutes must be a positive integer');
    }
    if (input.enabled && !input.backupUserId && !input.backupRole) {
      throw new Error(
        'An enabled escalation policy requires backupUserId or backupRole',
      );
    }
    const scopeId = input.scopeType === 'PLATFORM' ? null : input.scopeId;
    const reason = requireConfigurationChangeReason(input.reason);

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(NotificationEscalationPolicy);
      const auditRepository = manager.getRepository(NotificationPolicyAudit);

      const current = await repository.findOne({
        where: {
          scopeType: input.scopeType,
          scopeId: scopeId ?? IsNull(),
          category: input.category ?? IsNull(),
        },
        order: { version: 'DESC' },
      });

      const nextVersion = current ? current.version + 1 : 1;
      const saved = await repository.save(
        repository.create({
          scopeType: input.scopeType,
          scopeId,
          category: input.category ?? null,
          version: nextVersion,
          effectiveFrom: null,
          effectiveUntil: null,
          enabled: input.enabled,
          delayMinutes: input.delayMinutes,
          backupUserId: input.backupUserId,
          backupRole: input.backupRole,
          updatedBy: input.actorUserId,
        }),
      );

      await auditRepository.save(
        auditRepository.create({
          domain: 'NOTIFICATION_ESCALATION_POLICY',
          configurationKey: input.category ?? '*',
          scopeType: input.scopeType,
          scopeId,
          previousVersion: current?.version ?? null,
          newVersion: saved.version,
          before: current
            ? {
                enabled: current.enabled,
                delayMinutes: current.delayMinutes,
                backupUserId: current.backupUserId,
                backupRole: current.backupRole,
              }
            : null,
          after: {
            enabled: saved.enabled,
            delayMinutes: saved.delayMinutes,
            backupUserId: saved.backupUserId,
            backupRole: saved.backupRole,
          },
          actorUserId: input.actorUserId,
          actorRole: input.actorRole,
          reason,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
        }),
      );

      return saved;
    });
  }
}
