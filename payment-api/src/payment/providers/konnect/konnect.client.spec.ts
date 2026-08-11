import { Observable, of, throwError } from 'rxjs';
import {
  AxiosError,
  AxiosHeaders,
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import { KonnectClient } from './konnect.client';
import {
  KonnectAuthenticationError,
  KonnectInvalidResponseError,
  KonnectNetworkError,
  KonnectPaymentNotFoundError,
  KonnectRateLimitError,
  KonnectServerError,
  KonnectTimeoutError,
} from './konnect.exceptions';

function axiosError(
  status?: number,
  data: unknown = {},
  headers: Record<string, string> = {},
): AxiosError {
  const error = new AxiosError('Request failed');
  if (status !== undefined) {
    error.response = {
      status,
      statusText: '',
      data,
      headers,
      config: { headers: new AxiosHeaders() } as never,
    };
  }
  return error;
}

function timeoutError(): AxiosError {
  const error = new AxiosError('timeout of 15000ms exceeded');
  error.code = 'ECONNABORTED';
  return error;
}

describe('KonnectClient', () => {
  const config = {
    baseUrl: 'https://api.sandbox.konnect.network/api/v2',
    apiKey: 'test-api-key',
    walletId: 'wallet-123',
    webhookUrl: 'https://payment-api.example.com/payments/konnect/webhook',
  };

  let request: jest.Mock<Observable<AxiosResponse>, [AxiosRequestConfig]>;
  let httpService: { request: typeof request };
  let client: KonnectClient;

  beforeEach(() => {
    request = jest.fn<Observable<AxiosResponse>, [AxiosRequestConfig]>();
    httpService = { request };
    client = new KonnectClient(httpService as never, config);
  });

  describe('initPayment', () => {
    it('returns payUrl and paymentRef on success', async () => {
      request.mockReturnValueOnce(
        of({
          data: {
            payUrl: 'https://gateway.konnect.network/pay/abc',
            paymentRef: 'ref-123',
          },
        }),
      );

      const result = await client.initPayment({
        receiverWalletId: 'wallet-123',
        amount: 25500,
        token: 'TND',
      });

      expect(result).toEqual({
        payUrl: 'https://gateway.konnect.network/pay/abc',
        paymentRef: 'ref-123',
      });
      expect(request).toHaveBeenCalledTimes(1);
      const calledWith = request.mock.calls[0][0];
      expect(calledWith.headers['x-api-key']).toBe('test-api-key');
      expect(calledWith.method).toBe('POST');
      expect(calledWith.url).toBe('/payments/init-payment');
    });

    it('throws KonnectInvalidResponseError when the response is missing expected fields', async () => {
      request.mockReturnValueOnce(of({ data: { foo: 'bar' } }));

      await expect(
        client.initPayment({ receiverWalletId: 'wallet-123', amount: 25500 }),
      ).rejects.toThrow(KonnectInvalidResponseError);
    });

    it('never includes the API key in a thrown error message', async () => {
      request.mockReturnValue(throwError(() => axiosError(401)));

      await expect(
        client.initPayment({ receiverWalletId: 'wallet-123', amount: 25500 }),
      ).rejects.toThrow(KonnectAuthenticationError);

      try {
        await client.initPayment({
          receiverWalletId: 'wallet-123',
          amount: 25500,
        });
      } catch (error) {
        expect(JSON.stringify(error)).not.toContain('test-api-key');
        expect((error as Error).message).not.toContain('test-api-key');
      }
    });
  });

  describe('getPaymentDetails', () => {
    it('fetches payment details successfully', async () => {
      request.mockReturnValueOnce(
        of({
          data: {
            payment: {
              id: 'pay_1',
              status: 'completed',
              amountDue: 25500,
              reachedAmount: 25500,
              amount: 25500,
              token: 'TND',
              orderId: 'ORDER-1',
            },
          },
        }),
      );

      const result = await client.getPaymentDetails('pay_1');

      expect(result.payment.status).toBe('completed');
      const calledWith = request.mock.calls[0][0];
      expect(calledWith.method).toBe('GET');
      expect(calledWith.url).toBe('/payments/pay_1');
    });

    it('maps a 401 response to KonnectAuthenticationError with no retry', async () => {
      request.mockReturnValue(throwError(() => axiosError(401)));

      await expect(client.getPaymentDetails('pay_1')).rejects.toThrow(
        KonnectAuthenticationError,
      );
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('maps a 404 response to KonnectPaymentNotFoundError with no retry', async () => {
      request.mockReturnValue(throwError(() => axiosError(404)));

      await expect(client.getPaymentDetails('missing-payment')).rejects.toThrow(
        KonnectPaymentNotFoundError,
      );
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('retries a 429 with backoff and eventually throws KonnectRateLimitError', async () => {
      jest.useFakeTimers();
      try {
        request.mockReturnValue(
          throwError(() => axiosError(429, {}, { 'retry-after': '0' })),
        );

        const promise = client.getPaymentDetails('pay_1');
        const assertion = expect(promise).rejects.toThrow(
          KonnectRateLimitError,
        );

        await jest.runAllTimersAsync();
        await assertion;

        // initial attempt + 3 controlled retries = 4 total calls, never unbounded.
        expect(request).toHaveBeenCalledTimes(4);
      } finally {
        jest.useRealTimers();
      }
    });

    it('retries a 5xx with backoff and eventually throws KonnectServerError', async () => {
      jest.useFakeTimers();
      try {
        request.mockReturnValue(throwError(() => axiosError(503)));

        const promise = client.getPaymentDetails('pay_1');
        const assertion = expect(promise).rejects.toThrow(KonnectServerError);

        await jest.runAllTimersAsync();
        await assertion;

        expect(request).toHaveBeenCalledTimes(4);
      } finally {
        jest.useRealTimers();
      }
    });

    it('recovers from a transient 5xx once a retry succeeds', async () => {
      jest.useFakeTimers();
      try {
        request
          .mockReturnValueOnce(throwError(() => axiosError(503)))
          .mockReturnValueOnce(
            of({
              data: {
                payment: {
                  id: 'pay_1',
                  status: 'pending',
                  amountDue: 25500,
                  reachedAmount: 0,
                  amount: 25500,
                  token: 'TND',
                },
              },
            }),
          );

        const promise = client.getPaymentDetails('pay_1');
        await jest.runAllTimersAsync();
        const result = await promise;

        expect(result.payment.status).toBe('pending');
        expect(request).toHaveBeenCalledTimes(2);
      } finally {
        jest.useRealTimers();
      }
    });

    it('maps a request timeout to KonnectTimeoutError and retries a bounded number of times', async () => {
      jest.useFakeTimers();
      try {
        request.mockReturnValue(throwError(() => timeoutError()));

        const promise = client.getPaymentDetails('pay_1');
        const assertion = expect(promise).rejects.toThrow(KonnectTimeoutError);

        await jest.runAllTimersAsync();
        await assertion;

        expect(request).toHaveBeenCalledTimes(4);
      } finally {
        jest.useRealTimers();
      }
    });

    it('maps a network error (no response) to KonnectNetworkError', async () => {
      jest.useFakeTimers();
      try {
        const networkError = new AxiosError('Network Error');
        request.mockReturnValue(throwError(() => networkError));

        const promise = client.getPaymentDetails('pay_1');
        const assertion = expect(promise).rejects.toThrow(KonnectNetworkError);

        await jest.runAllTimersAsync();
        await assertion;
      } finally {
        jest.useRealTimers();
      }
    });

    it('throws KonnectInvalidResponseError when the payment status is missing', async () => {
      request.mockReturnValueOnce(of({ data: { payment: { id: 'pay_1' } } }));

      await expect(client.getPaymentDetails('pay_1')).rejects.toThrow(
        KonnectInvalidResponseError,
      );
    });
  });
});
