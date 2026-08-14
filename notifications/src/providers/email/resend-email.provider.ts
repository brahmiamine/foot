import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  EmailMessage,
  EmailProvider,
  EmailSendResult,
} from './email-provider.interface';

/** https://resend.com/docs/api-reference/emails/send-email */
@Injectable()
export class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend';
  private readonly logger = new Logger(ResendEmailProvider.name);

  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService,
  ) {}

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      throw new Error(
        'ResendEmailProvider is not configured (RESEND_API_KEY missing)',
      );
    }
    const response = await firstValueFrom(
      this.http.post<{ id: string }>(
        'https://api.resend.com/emails',
        {
          from: this.config.get<string>('SMTP_FROM') ?? 'no-reply@foot.tn',
          to: [message.to],
          subject: message.subject,
          text: message.body,
        },
        { headers: { Authorization: `Bearer ${apiKey}` } },
      ),
    );
    return { providerMessageId: response.data.id };
  }
}
