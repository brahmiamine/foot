import { Observable, of, throwError } from 'rxjs';
import {
  AxiosError,
  AxiosHeaders,
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import { FlouciClient } from './flouci.client';
import {
  FlouciAuthenticationError,
  FlouciBadRequestError,
  FlouciInvalidResponseError,
  FlouciNetworkError,
  FlouciPaymentNotFoundError,
  FlouciRateLimitError,
  FlouciServerError,
  FlouciTimeoutError,
} from './flouci.exceptions';

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

describe('FlouciClient', () => {
  const config = {
    baseUrl: 'https://developers.flouci.com',
    publicKey: 'test-public-key',
    privateKey: 'test-private-key',
    webhookUrl:
      'https://payment-api.example.com/payments/providers/flouci/webhook',
    successUrl: 'https://example.com/payment/success',
    failUrl: 'https://example.com/payment/fail',
  };

  let request: jest.Mock<Observable<AxiosResponse>, [AxiosRequestConfig]>;
  let httpService: { request: typeof request };
  let client: FlouciClient;

  beforeEach(() => {
    request = jest.fn<Observable<AxiosResponse>, [AxiosRequestConfig]>();
    httpService = { request };
    client = new FlouciClient(httpService as never, config);
  });

  const validPayload = {
    amount: 25500,
    developer_tracking_id: 'payment-123',
    accept_card: true,
    success_link: config.successUrl,
    fail_link: config.failUrl,
    webhook: config.webhookUrl,
  };

  describe('generatePayment', () => {
    it('returns payment_id/link on success and correctly maps the response data', async () => {
      request.mockReturnValueOnce(
        of({
          data: {
            result: {
              success: true,
              payment_id: 'FoPKKHqfQIKfBqhEj8M47A',
              link: 'https://flouci.com/pay/FoPKKHqfQIKfBqhEj8M47A',
              developer_tracking_id: 'payment-123',
            },
          },
        }),
      );

      const result = await client.generatePayment(validPayload);

      expect(result).toEqual({
        success: true,
        payment_id: 'FoPKKHqfQIKfBqhEj8M47A',
        link: 'https://flouci.com/pay/FoPKKHqfQIKfBqhEj8M47A',
        developer_tracking_id: 'payment-123',
      });
      expect(request).toHaveBeenCalledTimes(1);
      const calledWith = request.mock.calls[0][0];
      expect(calledWith.headers.Authorization).toBe(
        'Bearer test-public-key:test-private-key',
      );
      expect(calledWith.method).toBe('POST');
      expect(calledWith.url).toBe('/api/v2/generate_payment');
    });

    it('throws FlouciBadRequestError when Flouci responds with result.success: false', async () => {
      request.mockReturnValueOnce(
        of({
          data: {
            result: {
              success: false,
              payment_id: '',
              link: '',
              developer_tracking_id: 'payment-123',
            },
          },
        }),
      );

      await expect(client.generatePayment(validPayload)).rejects.toThrow(
        FlouciBadRequestError,
      );
    });

    it('throws FlouciInvalidResponseError when the response is missing expected fields', async () => {
      request.mockReturnValueOnce(of({ data: {} }));

      await expect(client.generatePayment(validPayload)).rejects.toThrow(
        FlouciInvalidResponseError,
      );
    });

    it('never includes the private key in a thrown error message', async () => {
      request.mockReturnValue(throwError(() => axiosError(401)));

      await expect(client.generatePayment(validPayload)).rejects.toThrow(
        FlouciAuthenticationError,
      );

      try {
        await client.generatePayment(validPayload);
      } catch (error) {
        expect(JSON.stringify(error)).not.toContain('test-private-key');
        expect((error as Error).message).not.toContain('test-private-key');
      }
    });

    it('maps a 401 response to FlouciAuthenticationError with no retry', async () => {
      request.mockReturnValue(throwError(() => axiosError(401)));

      await expect(client.generatePayment(validPayload)).rejects.toThrow(
        FlouciAuthenticationError,
      );
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('maps a request timeout to FlouciTimeoutError and retries a bounded number of times', async () => {
      jest.useFakeTimers();
      try {
        request.mockReturnValue(throwError(() => timeoutError()));

        const promise = client.generatePayment(validPayload);
        const assertion = expect(promise).rejects.toThrow(FlouciTimeoutError);

        await jest.runAllTimersAsync();
        await assertion;

        // initial attempt + 3 controlled retries = 4 total calls, never unbounded.
        expect(request).toHaveBeenCalledTimes(4);
      } finally {
        jest.useRealTimers();
      }
    });

    it('maps a network error (no response) to FlouciNetworkError', async () => {
      jest.useFakeTimers();
      try {
        const networkError = new AxiosError('Network Error');
        request.mockReturnValue(throwError(() => networkError));

        const promise = client.generatePayment(validPayload);
        const assertion = expect(promise).rejects.toThrow(FlouciNetworkError);

        await jest.runAllTimersAsync();
        await assertion;
      } finally {
        jest.useRealTimers();
      }
    });

    it('retries a 429 with backoff and eventually throws FlouciRateLimitError', async () => {
      jest.useFakeTimers();
      try {
        request.mockReturnValue(
          throwError(() => axiosError(429, {}, { 'retry-after': '0' })),
        );

        const promise = client.generatePayment(validPayload);
        const assertion = expect(promise).rejects.toThrow(FlouciRateLimitError);

        await jest.runAllTimersAsync();
        await assertion;

        expect(request).toHaveBeenCalledTimes(4);
      } finally {
        jest.useRealTimers();
      }
    });

    it('retries a 5xx with backoff and eventually throws FlouciServerError', async () => {
      jest.useFakeTimers();
      try {
        request.mockReturnValue(throwError(() => axiosError(503)));

        const promise = client.generatePayment(validPayload);
        const assertion = expect(promise).rejects.toThrow(FlouciServerError);

        await jest.runAllTimersAsync();
        await assertion;

        expect(request).toHaveBeenCalledTimes(4);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('verifyPayment', () => {
    it('fetches payment verification successfully', async () => {
      request.mockReturnValueOnce(
        of({
          data: {
            success: true,
            result: {
              type: 'wallet',
              amount: 25500,
              status: 'SUCCESS',
              developer_tracking_id: 'payment-123',
            },
          },
        }),
      );

      const result = await client.verifyPayment('FoPKKHqfQIKfBqhEj8M47A');

      expect(result.result.status).toBe('SUCCESS');
      const calledWith = request.mock.calls[0][0];
      expect(calledWith.method).toBe('GET');
      expect(calledWith.url).toBe(
        '/api/v2/verify_payment/FoPKKHqfQIKfBqhEj8M47A',
      );
    });

    it('maps a 404 response to FlouciPaymentNotFoundError with no retry', async () => {
      request.mockReturnValue(throwError(() => axiosError(404)));

      await expect(client.verifyPayment('missing-payment')).rejects.toThrow(
        FlouciPaymentNotFoundError,
      );
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('throws FlouciInvalidResponseError when result.status is missing', async () => {
      request.mockReturnValueOnce(
        of({ data: { success: true, result: { amount: 25500 } } }),
      );

      await expect(client.verifyPayment('pay_1')).rejects.toThrow(
        FlouciInvalidResponseError,
      );
    });

    it('recovers from a transient 5xx once a retry succeeds', async () => {
      jest.useFakeTimers();
      try {
        request
          .mockReturnValueOnce(throwError(() => axiosError(503)))
          .mockReturnValueOnce(
            of({
              data: {
                success: true,
                result: {
                  amount: 25500,
                  status: 'PENDING',
                  developer_tracking_id: 'payment-123',
                },
              },
            }),
          );

        const promise = client.verifyPayment('pay_1');
        await jest.runAllTimersAsync();
        const result = await promise;

        expect(result.result.status).toBe('PENDING');
        expect(request).toHaveBeenCalledTimes(2);
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
