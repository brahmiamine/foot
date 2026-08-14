import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Handlebars from 'handlebars';
import { Repository } from 'typeorm';
import { NotificationChannelType } from '../common/enums/channel.enum';
import {
  DEFAULT_LOCALE,
  NotificationLocale,
} from '../common/enums/locale.enum';
import { NotificationTemplate } from './entities/notification-template.entity';
import { DEFAULT_TEMPLATES } from './seed/default-templates';

export interface RenderedTemplate {
  subject: string | null;
  title: string | null;
  body: string;
}

const compileCache = new Map<string, Handlebars.TemplateDelegate>();

function compile(source: string): Handlebars.TemplateDelegate {
  const cached = compileCache.get(source);
  if (cached) return cached;
  const compiled = Handlebars.compile(source, { noEscape: true });
  compileCache.set(source, compiled);
  return compiled;
}

/**
 * Rendu des templates par (type, canal, langue) avec repli en cascade :
 * langue préférée -> FR -> notification brute (title/body fournis par
 * l'application appelante). Ce repli garantit qu'un type jamais templaté
 * reste envoyable sans modification du Notification API (§7, §14, §32).
 */
@Injectable()
export class TemplatesService implements OnModuleInit {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(
    @InjectRepository(NotificationTemplate)
    private readonly repository: Repository<NotificationTemplate>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedDefaults();
  }

  private async seedDefaults(): Promise<void> {
    let created = 0;
    for (const seed of DEFAULT_TEMPLATES) {
      const exists = await this.repository.findOne({
        where: { type: seed.type, channel: seed.channel, locale: seed.locale },
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
      where: { type, channel, locale },
    });
    if (exact) return exact;
    if (locale !== DEFAULT_LOCALE) {
      return this.repository.findOne({
        where: { type, channel, locale: DEFAULT_LOCALE },
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

  async upsert(
    type: string,
    channel: NotificationChannelType,
    locale: NotificationLocale,
    fields: { subject?: string | null; title?: string | null; body: string },
  ): Promise<NotificationTemplate> {
    let template = await this.repository.findOne({
      where: { type, channel, locale },
    });
    if (!template) {
      template = this.repository.create({
        type,
        channel,
        locale,
        subject: null,
        title: null,
        body: '',
      });
    }
    template.subject = fields.subject ?? template.subject ?? null;
    template.title = fields.title ?? template.title ?? null;
    template.body = fields.body;
    return this.repository.save(template);
  }

  async findAll(): Promise<NotificationTemplate[]> {
    return this.repository.find({
      order: { type: 'ASC', channel: 'ASC', locale: 'ASC' },
    });
  }
}
