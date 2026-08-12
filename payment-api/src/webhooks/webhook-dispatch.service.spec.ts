import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { createHmac } from 'crypto';
import { HttpService } from '@nestjs/axios';
import {
  WebhookDispatchService,
  WebhookPayload,
} from './webhook-dispatch.service';

describe('WebhookDispatchService', () => {
  const payload: WebhookPayload = {
    eventId: 'payment-paid:payment-1',
    paymentId: 'payment-1',
    orderId: 'ORDER-1',
    status: 'PAID',
    provider: 'konnect',
    providerRef: 'ref-123',
    amount: '25.500',
    currency: 'TND',
    userId: 'user-1',
  };

  function buildService(urls: Record<string, string>) {
    const httpService = { post: jest.fn() } as unknown as jest.Mocked<
      Pick<HttpService, 'post'>
    >;
    const service = new WebhookDispatchService(
      httpService as unknown as HttpService,
      urls,
    );
    return { service, httpService };
  }

  const envBackup = { ...process.env };
  afterEach(() => {
    process.env = { ...envBackup };
    jest.restoreAllMocks();
  });

  it('does nothing when callerApplication is null', async () => {
    process.env.PAYMENT_WEBHOOK_SECRET = 'secret';
    const { service, httpService } = buildService({
      billetterie: 'https://billetterie.example.com/api/payments/webhook',
    });

    await service.dispatch(null, payload);

    expect(httpService.post).not.toHaveBeenCalled();
  });

  it('does nothing when the caller has no configured URL', async () => {
    process.env.PAYMENT_WEBHOOK_SECRET = 'secret';
    const { service, httpService } = buildService({});

    await service.dispatch('billetterie', payload);

    expect(httpService.post).not.toHaveBeenCalled();
  });

  it('does nothing when PAYMENT_WEBHOOK_SECRET is missing', async () => {
    delete process.env.PAYMENT_WEBHOOK_SECRET;
    const { service, httpService } = buildService({
      billetterie: 'https://billetterie.example.com/api/payments/webhook',
    });

    await service.dispatch('billetterie', payload);

    expect(httpService.post).not.toHaveBeenCalled();
  });

  it('posts a correctly HMAC-signed body to the configured URL', async () => {
    process.env.PAYMENT_WEBHOOK_SECRET = 'top-secret';
    const url = 'https://billetterie.example.com/api/payments/webhook';
    const { service, httpService } = buildService({ billetterie: url });
    httpService.post.mockReturnValue(
      of({ data: {} } as AxiosResponse<unknown>),
    );

    await service.dispatch('billetterie', payload);

    expect(httpService.post).toHaveBeenCalledTimes(1);
    const [calledUrl, body, config] = httpService.post.mock.calls[0] as [
      string,
      string,
      { headers: Record<string, string> },
    ];
    expect(calledUrl).toBe(url);
    expect(JSON.parse(body)).toEqual(payload);

    const expectedSignature = createHmac('sha256', 'top-secret')
      .update(body)
      .digest('hex');
    expect(config.headers['X-Payment-Signature']).toBe(
      `sha256=${expectedSignature}`,
    );
  });

  it('retries on failure and succeeds once a later attempt gets through', async () => {
    process.env.PAYMENT_WEBHOOK_SECRET = 'secret';
    const { service, httpService } = buildService({
      billetterie: 'https://billetterie.example.com/api/payments/webhook',
    });
    httpService.post
      .mockReturnValueOnce(throwError(() => new Error('network down')))
      .mockReturnValueOnce(of({ data: {} } as AxiosResponse<unknown>));
    jest.spyOn(global, 'setTimeout').mockImplementation((fn: () => void) => {
      fn();
      return 0 as unknown as NodeJS.Timeout;
    });

    await service.dispatch('billetterie', payload);

    expect(httpService.post).toHaveBeenCalledTimes(2);
  });

  it('gives up silently (never throws) after exhausting all retries', async () => {
    process.env.PAYMENT_WEBHOOK_SECRET = 'secret';
    const { service, httpService } = buildService({
      billetterie: 'https://billetterie.example.com/api/payments/webhook',
    });
    httpService.post.mockReturnValue(
      throwError(() => new Error('network down')),
    );
    jest.spyOn(global, 'setTimeout').mockImplementation((fn: () => void) => {
      fn();
      return 0 as unknown as NodeJS.Timeout;
    });

    await expect(
      service.dispatch('billetterie', payload),
    ).resolves.toBeUndefined();
    expect(httpService.post).toHaveBeenCalledTimes(3);
  });
});
