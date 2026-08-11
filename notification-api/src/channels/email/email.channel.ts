import { Inject, Injectable } from '@nestjs/common';
import { NotificationChannelType } from '../../common/enums/channel.enum';
import {
  EMAIL_PROVIDER,
  type EmailProvider,
} from '../../providers/email/email-provider.interface';
import { TemplatesService } from '../../templates/templates.service';
import type {
  ChannelDeliveryContext,
  ChannelDeliveryResult,
  NotificationChannel,
} from '../channel.interface';

@Injectable()
export class EmailChannel implements NotificationChannel {
  readonly type = NotificationChannelType.EMAIL;

  constructor(
    @Inject(EMAIL_PROVIDER) private readonly provider: EmailProvider,
    private readonly templates: TemplatesService,
  ) {}

  async deliver(
    context: ChannelDeliveryContext,
  ): Promise<ChannelDeliveryResult> {
    const { notification, recipient, branding } = context;
    if (!recipient.email) {
      throw new Error(`Recipient ${notification.userId} has no email on file`);
    }

    const firstName =
      (recipient.name ?? '').split(' ')[0] || recipient.name || '';
    const variables = {
      ...(notification.data ?? {}),
      firstName,
      fullName: recipient.name,
      clubName: branding.name,
    };

    const rendered = await this.templates.render(
      notification.type,
      this.type,
      recipient.locale,
      variables,
      { title: notification.title, body: notification.body },
    );

    const result = await this.provider.send({
      to: recipient.email,
      subject: rendered.subject ?? notification.title,
      body: rendered.body,
    });
    return { providerMessageId: result.providerMessageId };
  }
}
