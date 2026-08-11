import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';
import {
  EmailMessage,
  EmailProvider,
  EmailSendResult,
} from './email-provider.interface';

@Injectable()
export class SmtpEmailProvider implements EmailProvider, OnModuleInit {
  readonly name = 'smtp';
  private readonly logger = new Logger(SmtpEmailProvider.name);
  private transporter: Transporter | null = null;
  private from = 'no-reply@foot.tn';

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const host = this.config.get<string>('SMTP_HOST');
    this.from = this.config.get<string>('SMTP_FROM') ?? this.from;
    if (!host) {
      this.logger.warn('SMTP_HOST not set: SmtpEmailProvider is inactive.');
      return;
    }
    this.transporter = nodemailer.createTransport({
      host,
      port: this.config.get<number>('SMTP_PORT') ?? 587,
      secure: (this.config.get<number>('SMTP_PORT') ?? 587) === 465,
      auth: this.config.get<string>('SMTP_USER')
        ? {
            user: this.config.get<string>('SMTP_USER'),
            pass: this.config.get<string>('SMTP_PASSWORD'),
          }
        : undefined,
    });
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    if (!this.transporter) {
      throw new Error(
        'SmtpEmailProvider is not configured (SMTP_HOST missing)',
      );
    }
    const info = (await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.body,
    })) as { messageId?: string };
    return { providerMessageId: info.messageId };
  }
}
