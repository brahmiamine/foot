import { Injectable } from '@nestjs/common';
import { BrandingService } from '../branding/branding.service';
import { SharedDirectoryService } from '../database/shared-directory.service';
import { PreferencesService } from '../preferences/preferences.service';
import { ChannelDeliveryContext } from '../channels/channel.interface';
import { Notification } from '../notifications/entities/notification.entity';

/** Assemble le contexte de livraison (destinataire + branding) requis par NotificationChannel.deliver(). */
@Injectable()
export class RecipientContextService {
  constructor(
    private readonly directory: SharedDirectoryService,
    private readonly preferences: PreferencesService,
    private readonly branding: BrandingService,
  ) {}

  async resolve(notification: Notification): Promise<ChannelDeliveryContext> {
    const locale = await this.preferences.getLocale(notification.userId);
    const branding = await this.branding.getBranding(notification.teamId);

    let email: string | null = null;
    let name: string | null = null;
    let phoneNumber: string | null = null;
    if (this.directory.isEnabled()) {
      const contact = await this.directory.getUserContact(notification.userId);
      email = contact?.email ?? null;
      name = contact?.name ?? null;
      phoneNumber = contact?.phoneNumber ?? null;
    }

    return {
      notification,
      recipient: { email, name, phoneNumber, locale },
      branding,
    };
  }
}
