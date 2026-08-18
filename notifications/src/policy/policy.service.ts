import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import {
  resolvePolicy,
  type PolicyRecord,
} from '../common/domain-contracts/policy';
import { requireConfigurationChangeReason } from '../common/domain-contracts/configuration-audit';
import { NotificationChannelType } from '../common/enums/channel.enum';
import { ChannelPolicyMode } from '../common/enums/channel-policy-mode.enum';
import { isMandatoryNotificationType } from '../common/constants/mandatory-types';
import {
  NotificationPolicy,
  type NotificationPolicyScopeType,
} from './entities/notification-policy.entity';
import { NotificationPolicyAudit } from './entities/notification-policy-audit.entity';

/**
 * Un canal par clé de premier niveau (plutôt qu'un objet `channels` imbriqué)
 * : `resolvePolicy` hérite/écrase clé par clé au premier niveau seulement —
 * imbriquer romprait l'héritage par canal (un enregistrement CLUB ne fixant
 * qu'EMAIL remplacerait tout l'objet `channels` hérité de PLATFORM, y
 * compris les canaux qu'il ne voulait pas toucher).
 */
export type PolicyValues = Record<NotificationChannelType, ChannelPolicyMode>;

const DEFAULT_POLICY_VALUES: PolicyValues = {
  [NotificationChannelType.IN_APP]: ChannelPolicyMode.DEFAULT,
  [NotificationChannelType.EMAIL]: ChannelPolicyMode.DEFAULT,
  [NotificationChannelType.PUSH]: ChannelPolicyMode.DEFAULT,
  [NotificationChannelType.SMS]: ChannelPolicyMode.DEFAULT,
};

export interface ResolvedChannelSelection {
  mandatory: NotificationChannelType[];
  eligibleForPreference: NotificationChannelType[];
  disabled: NotificationChannelType[];
}

export interface UpsertNotificationPolicyInput {
  scopeType: NotificationPolicyScopeType;
  /** Ignoré pour PLATFORM (toujours NULL) ; requis (et forcé côté serveur) pour CLUB. */
  scopeId: string | null;
  category: string | null;
  channels: Partial<Record<NotificationChannelType, ChannelPolicyMode>>;
  effectiveFrom?: Date | null;
  effectiveUntil?: Date | null;
  actorUserId: string;
  actorRole: string;
  reason: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

function toPolicyRecord(row: NotificationPolicy): PolicyRecord<PolicyValues> {
  return {
    id: row.id,
    scopeType: row.scopeType,
    scopeId: row.scopeId,
    version: row.version,
    effectiveFrom: row.effectiveFrom,
    effectiveUntil: row.effectiveUntil,
    values: row.channels,
  };
}

/**
 * NOTIF-001 : résout, pour une catégorie et un club donnés, le mode
 * (MANDATORY/DEFAULT/DISABLED) de chaque canal candidat, à partir des
 * policies PLATFORM et CLUB actives. La résolution par catégorie se fait en
 * deux temps *avant* d'appeler `resolvePolicy` : on isole d'abord les
 * enregistrements de la catégorie exacte, sinon on retombe sur les
 * enregistrements joker (`category IS NULL`) — mélanger les deux dans un
 * même appel à `resolvePolicy` produirait deux enregistrements concurrents
 * sur la même portée ("PLATFORM:PLATFORM") et déclencherait son garde-fou
 * anti-ambiguïté.
 */
@Injectable()
export class PolicyService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(NotificationPolicy)
    private readonly repository: Repository<NotificationPolicy>,
    @InjectRepository(NotificationPolicyAudit)
    private readonly auditRepository: Repository<NotificationPolicyAudit>,
  ) {}

  async resolve(
    teamId: string | null,
    category: string,
    at: Date = new Date(),
  ): Promise<PolicyValues> {
    const all = await this.repository.find();
    const exact = all.filter((row) => row.category === category);
    const applicable =
      exact.length > 0 ? exact : all.filter((row) => row.category === null);

    const resolved = resolvePolicy(
      DEFAULT_POLICY_VALUES,
      applicable.map(toPolicyRecord),
      { clubId: teamId },
      at,
    );
    return resolved.values;
  }

  /**
   * Combine la NotificationPolicy résolue avec la liste (historique, figée)
   * des types toujours obligatoires : celle-ci constitue un plancher que la
   * policy ne peut jamais abaisser vers DEFAULT/DISABLED, seulement relever
   * vers MANDATORY.
   */
  async resolveChannelSelection(
    teamId: string | null,
    type: string,
    category: string,
    candidateChannels: NotificationChannelType[],
  ): Promise<ResolvedChannelSelection> {
    const policy = await this.resolve(teamId, category);
    const legacyMandatory = isMandatoryNotificationType(type);

    const mandatory: NotificationChannelType[] = [];
    const eligibleForPreference: NotificationChannelType[] = [];
    const disabled: NotificationChannelType[] = [];

    for (const channel of candidateChannels) {
      const mode = policy[channel] ?? ChannelPolicyMode.DEFAULT;
      if (legacyMandatory || mode === ChannelPolicyMode.MANDATORY) {
        mandatory.push(channel);
      } else if (mode === ChannelPolicyMode.DISABLED) {
        disabled.push(channel);
      } else {
        eligibleForPreference.push(channel);
      }
    }

    return { mandatory, eligibleForPreference, disabled };
  }

  async findAll(): Promise<NotificationPolicy[]> {
    return this.repository.find({
      order: { category: 'ASC', scopeType: 'ASC' },
    });
  }

  async upsert(
    input: UpsertNotificationPolicyInput,
  ): Promise<NotificationPolicy> {
    if (input.scopeType === 'CLUB' && !input.scopeId) {
      throw new Error(
        'scopeId is required for CLUB-scoped notification policies',
      );
    }
    const scopeId = input.scopeType === 'PLATFORM' ? null : input.scopeId;
    const reason = requireConfigurationChangeReason(input.reason);

    for (const mode of Object.values(input.channels)) {
      if (!Object.values(ChannelPolicyMode).includes(mode)) {
        throw new Error(`Invalid channel policy mode: ${String(mode)}`);
      }
    }

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(NotificationPolicy);
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
          effectiveFrom: input.effectiveFrom ?? null,
          effectiveUntil: input.effectiveUntil ?? null,
          channels: input.channels,
          updatedBy: input.actorUserId,
        }),
      );

      await auditRepository.save(
        auditRepository.create({
          domain: 'NOTIFICATION_POLICY',
          configurationKey: input.category ?? '*',
          scopeType: input.scopeType,
          scopeId,
          previousVersion: current?.version ?? null,
          newVersion: saved.version,
          before: current ? { channels: current.channels } : null,
          after: { channels: saved.channels },
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
