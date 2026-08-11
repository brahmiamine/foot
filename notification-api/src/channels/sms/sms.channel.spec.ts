import { SmsChannel } from './sms.channel';
import type { ChannelDeliveryContext } from '../channel.interface';
import type { Notification } from '../../notifications/entities/notification.entity';

function makeContext(
  data: Record<string, unknown> | null,
  overrides: Partial<Notification> = {},
) {
  return {
    notification: {
      id: 'notif-1',
      body: 'Rappel match',
      data,
      ...overrides,
    } as Notification,
    recipient: { email: null, name: null, locale: 'fr' as never },
    branding: { name: 'Foot', nameAr: null, logoUrl: null },
  } as ChannelDeliveryContext;
}

describe('SmsChannel', () => {
  it('throws a clear error when the notification has no data.phone', async () => {
    const provider = { name: 'tunisiesms', send: jest.fn() };
    const channel = new SmsChannel(provider);

    await expect(channel.deliver(makeContext(null))).rejects.toThrow(
      /data.phone/,
    );
    expect(provider.send).not.toHaveBeenCalled();
  });

  it('sends the phone number, message body and optional sender from notification.data', async () => {
    const provider = {
      name: 'tunisiesms',
      send: jest.fn().mockResolvedValue({
        success: true,
        providerMessageId: 'XYZ-1',
        providerStatus: 'ok',
      }),
    };
    const channel = new SmsChannel(provider);

    const result = await channel.deliver(
      makeContext({ phone: '+21612345678', smsSender: 'FootClub' }),
    );

    expect(provider.send).toHaveBeenCalledWith({
      to: '+21612345678',
      body: 'Rappel match',
      sender: 'FootClub',
    });
    expect(result).toEqual({
      providerMessageId: 'XYZ-1',
      providerStatus: 'ok',
    });
  });

  it('flags the channel as requiring delivery confirmation (never auto-marked DELIVERED)', () => {
    const channel = new SmsChannel({
      name: 'tunisiesms',
      send: jest.fn(),
    });

    expect(channel.deliveryConfirmationRequired).toBe(true);
  });

  it('throws with the provider error message when the send fails', async () => {
    const provider = {
      name: 'tunisiesms',
      send: jest.fn().mockResolvedValue({
        success: false,
        errorCode: 'INSUFFICIENT_CREDIT',
        errorMessage: 'Insufficient credit',
      }),
    };
    const channel = new SmsChannel(provider);

    await expect(
      channel.deliver(makeContext({ phone: '+21612345678' })),
    ).rejects.toThrow('Insufficient credit');
  });
});
