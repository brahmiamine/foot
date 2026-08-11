import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  EmailMessage,
  EmailProvider,
  EmailSendResult,
} from './email-provider.interface';

/** https://docs.sendgrid.com/api-reference/mail-send/mail-send */
@Injectable()
export class SendgridEmailProvider implements EmailProvider {
  readonly name = 'sendgrid';

  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService,
  ) {}

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const apiKey = this.config.get<string>('SENDGRID_API_KEY');
    if (!apiKey) {
      throw new Error(
        'SendgridEmailProvider is not configured (SENDGRID_API_KEY missing)',
      );
    }
    const from = this.config.get<string>('SMTP_FROM') ?? 'no-reply@foot.tn';
    const response = await firstValueFrom(
      this.http.post(
        'https://api.sendgrid.com/v3/mail/send',
        {
          personalizations: [{ to: [{ email: message.to }] }],
          from: { email: from },
          subject: message.subject,
          content: [{ type: 'text/plain', value: message.body }],
        },
        {
          headers: { Authorization: `Bearer ${apiKey}` },
          validateStatus: (status) => status < 300,
        },
      ),
    );
    const messageId = response.headers['x-message-id'] as string | undefined;
    return { providerMessageId: messageId };
  }
}
