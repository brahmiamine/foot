import { SmsChannel } from './sms.channel';
import type { SmsProvider } from '../../providers/sms/sms-provider.interface';
import type { ChannelDeliveryContext } from '../channel.interface';
import { NotificationLocale } from '../../common/enums/locale.enum';
import { Notification } from '../../notifications/entities/notification.entity';

function buildContext(
  overrides: Partial<ChannelDeliveryContext['recipient']> = {},
): ChannelDeliveryContext {
  return {
    notification: {
      userId: 'user-1',
      body: 'Votre commande est prête',
    } as Notification,
    recipient: {
      email: null,
      name: 'Amal',
      phoneNumber: '20 123 456',
      locale: NotificationLocale.FR,
      ...overrides,
    },
    branding: { name: 'Club', nameAr: null, logoUrl: null },
  };
}

describe('SmsChannel (TS-45)', () => {
  it('normalizes the recipient phone number before calling the provider', async () => {
    const send = jest.fn().mockResolvedValue(undefined);
    const provider: SmsProvider = { name: 'stub', send };
    const channel = new SmsChannel(provider);

    await channel.deliver(buildContext());

    expect(send).toHaveBeenCalledWith({
      to: '+21620123456',
      body: 'Votre commande est prête',
    });
  });

  it('throws without calling the provider when there is no usable phone number', async () => {
    const send = jest.fn();
    const provider: SmsProvider = { name: 'stub', send };
    const channel = new SmsChannel(provider);

    await expect(
      channel.deliver(buildContext({ phoneNumber: null })),
    ).rejects.toThrow(/no valid Tunisian phone number/);
    expect(send).not.toHaveBeenCalled();
  });

  it('propagates a provider failure (e.g. NotImplementedSmsProvider) to the caller', async () => {
    const send = jest
      .fn()
      .mockRejectedValue(new Error('SMS channel is not implemented yet'));
    const provider: SmsProvider = { name: 'not-implemented', send };
    const channel = new SmsChannel(provider);

    await expect(channel.deliver(buildContext())).rejects.toThrow(
      'SMS channel is not implemented yet',
    );
  });
});
