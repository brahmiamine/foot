import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import Handlebars from 'handlebars';
import { DataSource, Repository } from 'typeorm';
import { requireConfigurationChangeReason } from '../common/domain-contracts/configuration-audit';
import { NotificationChannelType } from '../common/enums/channel.enum';
import {
  DEFAULT_LOCALE,
  NotificationLocale,
} from '../common/enums/locale.enum';
import { TemplateStatus } from '../common/enums/template-status.enum';
import { NotificationPolicyAudit } from '../policy/entities/notification-policy-audit.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { DEFAULT_TEMPLATES } from './seed/default-templates';

export interface RenderedTemplate {
  subject: string | null;
  title: string | null;
  body: string;
}

export interface TemplateActor {
  userId: string;
  role: string;
  reason: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

const compileCache = new Map<string, Handlebars.TemplateDelegate>();

function compile(source: string): Handlebars.TemplateDelegate {
  const cached = compileCache.get(source);
  if (cached) return cached;
  const compiled = Handlebars.compile(source, { noEscape: true });
  compileCache.set(source, compiled);
  return compiled;
}

function snapshot(template: NotificationTemplate): Record<string, unknown> {
  return {
    status: template.status,
    version: template.version,
    subject: template.subject,
    title: template.title,
    body: template.body,
  };
}

/**
 * Rendu des templates par (type, canal, langue) avec repli en cascade :
 * langue préférée -> FR -> notification brute (title/body fournis par
 * l'application appelante). Ce repli garantit qu'un type jamais templaté
 * reste envoyable sans modification du Notification API (§7, §14, §32).
 *
 * NOTIF-005 : workflow DRAFT→SUBMITTED→APPROVED→ACTIVE→ARCHIVED. `render`/
 * `findTemplate` ne lisent jamais que la version ACTIVE ; les autres statuts
 * ne sont visibles que via l'administration (voir AdminTemplatesController).
 */
@Injectable()
export class TemplatesService implements OnModuleInit {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(NotificationTemplate)
    private readonly repository: Repository<NotificationTemplate>,
    @InjectRepository(NotificationPolicyAudit)
    private readonly auditRepository: Repository<NotificationPolicyAudit>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedDefaults();
  }

  private async seedDefaults(): Promise<void> {
    let created = 0;
    for (const seed of DEFAULT_TEMPLATES) {
      const exists = await this.repository.findOne({
        where: {
          type: seed.type,
          channel: seed.channel,
          locale: seed.locale,
          status: TemplateStatus.ACTIVE,
        },
      });
      if (exists) continue;
      await this.repository.save(
        this.repository.create({
          type: seed.type,
          channel: seed.channel,
          locale: seed.locale,
          subject: seed.subject ?? null,
          title: seed.title ?? null,
          body: seed.body,
          status: TemplateStatus.ACTIVE,
          version: 1,
          createdBy: null,
          submittedBy: null,
          approvedBy: null,
          activatedAt: new Date(),
        }),
      );
      created += 1;
    }
    if (created > 0) {
      this.logger.log(`Seeded ${created} default notification template(s).`);
    }
  }

  async findTemplate(
    type: string,
    channel: NotificationChannelType,
    locale: NotificationLocale,
  ): Promise<NotificationTemplate | null> {
    const exact = await this.repository.findOne({
      where: { type, channel, locale, status: TemplateStatus.ACTIVE },
    });
    if (exact) return exact;
    if (locale !== DEFAULT_LOCALE) {
      return this.repository.findOne({
        where: {
          type,
          channel,
          locale: DEFAULT_LOCALE,
          status: TemplateStatus.ACTIVE,
        },
      });
    }
    return null;
  }

  /**
   * Rend un template pour (type, canal, langue) avec les variables fournies.
   * Sans template trouvé, retombe sur `fallbackTitle`/`fallbackBody` (issus
   * de la notification elle-même) sans jamais échouer l'envoi.
   */
  async render(
    type: string,
    channel: NotificationChannelType,
    locale: NotificationLocale,
    variables: Record<string, unknown>,
    fallback: { title: string; body: string },
  ): Promise<RenderedTemplate> {
    const template = await this.findTemplate(type, channel, locale);
    if (!template) {
      return {
        subject: fallback.title,
        title: fallback.title,
        body: fallback.body,
      };
    }
    return {
      subject: template.subject ? compile(template.subject)(variables) : null,
      title: template.title
        ? compile(template.title)(variables)
        : fallback.title,
      body: compile(template.body)(variables),
    };
  }

  async findAll(status?: TemplateStatus): Promise<NotificationTemplate[]> {
    return this.repository.find({
      where: status ? { status } : {},
      order: { type: 'ASC', channel: 'ASC', locale: 'ASC', version: 'DESC' },
    });
  }

  async findOneOrThrow(id: string): Promise<NotificationTemplate> {
    const template = await this.repository.findOne({ where: { id } });
    if (!template) throw new Error(`Template ${id} not found`);
    return template;
  }

  /** Crée un nouveau brouillon — une nouvelle version de (type, channel, locale). */
  async createDraft(
    type: string,
    channel: NotificationChannelType,
    locale: NotificationLocale,
    fields: { subject?: string | null; title?: string | null; body: string },
    actorUserId: string,
  ): Promise<NotificationTemplate> {
    const existing = await this.repository.find({
      where: { type, channel, locale },
    });
    const nextVersion =
      existing.length > 0 ? Math.max(...existing.map((t) => t.version)) + 1 : 1;

    return this.repository.save(
      this.repository.create({
        type,
        channel,
        locale,
        subject: fields.subject ?? null,
        title: fields.title ?? null,
        body: fields.body,
        status: TemplateStatus.DRAFT,
        version: nextVersion,
        createdBy: actorUserId,
        submittedBy: null,
        approvedBy: null,
        activatedAt: null,
      }),
    );
  }

  async submit(id: string, actorUserId: string): Promise<NotificationTemplate> {
    const template = await this.findOneOrThrow(id);
    if (template.status !== TemplateStatus.DRAFT) {
      throw new Error(`Cannot submit a template in status ${template.status}`);
    }
    template.status = TemplateStatus.SUBMITTED;
    template.submittedBy = actorUserId;
    return this.repository.save(template);
  }

  /** Renvoie un template soumis en brouillon (demande de modification). */
  async requestChanges(
    id: string,
    actor: TemplateActor,
  ): Promise<NotificationTemplate> {
    const template = await this.findOneOrThrow(id);
    if (template.status !== TemplateStatus.SUBMITTED) {
      throw new Error(
        `Cannot request changes on a template in status ${template.status}`,
      );
    }
    return this.transitionWithAudit(
      template,
      TemplateStatus.DRAFT,
      actor,
      (t) => {
        t.submittedBy = null;
      },
    );
  }

  /** SUBMITTED → APPROVED. Maker/checker : l'auteur de la soumission ne peut pas approuver. */
  async approve(
    id: string,
    actor: TemplateActor,
  ): Promise<NotificationTemplate> {
    const template = await this.findOneOrThrow(id);
    if (template.status !== TemplateStatus.SUBMITTED) {
      throw new Error(`Cannot approve a template in status ${template.status}`);
    }
    if (template.submittedBy === actor.userId) {
      throw new Error('The submitter cannot approve their own template');
    }
    return this.transitionWithAudit(
      template,
      TemplateStatus.APPROVED,
      actor,
      (t) => {
        t.approvedBy = actor.userId;
      },
    );
  }

  /**
   * APPROVED → ACTIVE. Archive automatiquement l'ancienne version ACTIVE de
   * la même clé (type, channel, locale) : au plus une version ACTIVE à la
   * fois.
   */
  async activate(
    id: string,
    actor: TemplateActor,
  ): Promise<NotificationTemplate> {
    const template = await this.findOneOrThrow(id);
    if (template.status !== TemplateStatus.APPROVED) {
      throw new Error(
        `Cannot activate a template in status ${template.status}`,
      );
    }
    const reason = requireConfigurationChangeReason(actor.reason);

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(NotificationTemplate);
      const auditRepository = manager.getRepository(NotificationPolicyAudit);

      const previousActive = await repository.findOne({
        where: {
          type: template.type,
          channel: template.channel,
          locale: template.locale,
          status: TemplateStatus.ACTIVE,
        },
      });
      if (previousActive) {
        const before = snapshot(previousActive);
        previousActive.status = TemplateStatus.ARCHIVED;
        const savedPrevious = await repository.save(previousActive);
        await auditRepository.save(
          auditRepository.create({
            domain: 'NOTIFICATION_TEMPLATE',
            configurationKey: `${template.type}:${template.channel}:${template.locale}`,
            scopeType: 'TEMPLATE',
            scopeId: savedPrevious.id,
            previousVersion: savedPrevious.version,
            newVersion: savedPrevious.version,
            before,
            after: snapshot(savedPrevious),
            actorUserId: actor.userId,
            actorRole: actor.role,
            reason: `${reason} (superseded by version ${template.version})`,
            ipAddress: actor.ipAddress ?? null,
            userAgent: actor.userAgent ?? null,
          }),
        );
      }

      const before = snapshot(template);
      template.status = TemplateStatus.ACTIVE;
      template.activatedAt = new Date();
      const saved = await repository.save(template);
      await auditRepository.save(
        auditRepository.create({
          domain: 'NOTIFICATION_TEMPLATE',
          configurationKey: `${template.type}:${template.channel}:${template.locale}`,
          scopeType: 'TEMPLATE',
          scopeId: saved.id,
          previousVersion: before.version as number,
          newVersion: saved.version,
          before,
          after: snapshot(saved),
          actorUserId: actor.userId,
          actorRole: actor.role,
          reason,
          ipAddress: actor.ipAddress ?? null,
          userAgent: actor.userAgent ?? null,
        }),
      );
      return saved;
    });
  }

  /** Depuis DRAFT/SUBMITTED/APPROVED (annulation) ou ACTIVE (dépréciation sans remplacement). */
  async archive(
    id: string,
    actor: TemplateActor,
  ): Promise<NotificationTemplate> {
    const template = await this.findOneOrThrow(id);
    if (template.status === TemplateStatus.ARCHIVED) {
      throw new Error('Template is already archived');
    }
    return this.transitionWithAudit(template, TemplateStatus.ARCHIVED, actor);
  }

  private async transitionWithAudit(
    template: NotificationTemplate,
    nextStatus: TemplateStatus,
    actor: TemplateActor,
    mutate?: (template: NotificationTemplate) => void,
  ): Promise<NotificationTemplate> {
    const reason = requireConfigurationChangeReason(actor.reason);
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(NotificationTemplate);
      const auditRepository = manager.getRepository(NotificationPolicyAudit);

      const before = snapshot(template);
      template.status = nextStatus;
      mutate?.(template);
      const saved = await repository.save(template);

      await auditRepository.save(
        auditRepository.create({
          domain: 'NOTIFICATION_TEMPLATE',
          configurationKey: `${template.type}:${template.channel}:${template.locale}`,
          scopeType: 'TEMPLATE',
          scopeId: saved.id,
          previousVersion: before.version as number,
          newVersion: saved.version,
          before,
          after: snapshot(saved),
          actorUserId: actor.userId,
          actorRole: actor.role,
          reason,
          ipAddress: actor.ipAddress ?? null,
          userAgent: actor.userAgent ?? null,
        }),
      );
      return saved;
    });
  }
}
