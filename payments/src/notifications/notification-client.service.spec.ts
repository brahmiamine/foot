import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { HttpService } from '@nestjs/axios';
import { NotificationClientService } from './notification-client.service';

describe('NotificationClientService', () => {
  function buildService(config: { url?: string; apiKey?: string }) {
    const httpService = { post: jest.fn() } as unknown as jest.Mocked<
      Pick<HttpService, 'post'>
    >;
    const service = new NotificationClientService(
      httpService as unknown as HttpService,
      config,
    );
    return { service, httpService };
  }

  it('does nothing when NOTIFICATION_API_URL is missing', async () => {
    const { service, httpService } = buildService({ apiKey: 'key' });

    await service.notify({ type: 'PAYMENT_SUCCEEDED', title: 't', body: 'b' });

    expect(httpService.post).not.toHaveBeenCalled();
  });

  it('does nothing when NOTIFICATION_API_KEY is missing', async () => {
    const { service, httpService } = buildService({
      url: 'http://localhost:3010',
    });

    await service.notify({ type: 'PAYMENT_SUCCEEDED', title: 't', body: 'b' });

    expect(httpService.post).not.toHaveBeenCalled();
  });

  it('posts to /internal/notifications with the service api key when configured', async () => {
    const { service, httpService } = buildService({
      url: 'http://localhost:3010',
      apiKey: 'payments-key',
    });
    httpService.post.mockReturnValue(
      of({ data: {} } as AxiosResponse<unknown>),
    );

    await service.notify({
      eventId: 'payment-succeeded:payment-1',
      type: 'PAYMENT_SUCCEEDED',
      userId: 'user-1',
      title: 'Paiement confirmé',
      body: 'Votre paiement a été confirmé.',
    });

    expect(httpService.post).toHaveBeenCalledWith(
      'http://localhost:3010/internal/notifications',
      expect.objectContaining({ type: 'PAYMENT_SUCCEEDED', userId: 'user-1' }),
      expect.objectContaining({
        headers: { 'x-api-key': 'payments-key' },
      }),
    );
  });

  it('swallows errors instead of throwing', async () => {
    const { service, httpService } = buildService({
      url: 'http://localhost:3010',
      apiKey: 'payments-key',
    });
    httpService.post.mockReturnValue(
      throwError(() => new Error('network down')),
    );

    await expect(
      service.notify({ type: 'PAYMENT_SUCCEEDED', title: 't', body: 'b' }),
    ).resolves.toBeUndefined();
  });
});
