import { Observable, of, throwError } from 'rxjs';
import {
  AxiosError,
  AxiosHeaders,
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import { PaymeeClient } from './paymee.client';
import {
  PaymeeAuthenticationError,
  PaymeeBadRequestError,
  PaymeeInvalidResponseError,
  PaymeeNetworkError,
  PaymeeRateLimitError,
  PaymeeServerError,
  PaymeeTimeoutError,
} from './paymee.exceptions';

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

describe('PaymeeClient', () => {
  const config = {
    baseUrl: 'https://sandbox.paymee.tn/api/v2',
    apiKey: 'test-api-key',
    webhookUrl:
      'https://payment-api.example.com/payments/providers/paymee/webhook',
    returnUrl: 'https://example.com/payment/return',
    cancelUrl: 'https://example.com/payment/cancel',
  };

  let request: jest.Mock<Observable<AxiosResponse>, [AxiosRequestConfig]>;
  let httpService: { request: typeof request };
  let client: PaymeeClient;

  beforeEach(() => {
    request = jest.fn<Observable<AxiosResponse>, [AxiosRequestConfig]>();
    httpService = { request };
    client = new PaymeeClient(httpService as never, config);
  });

  const validPayload = {
    amount: 220.25,
    note: 'Order #123',
    first_name: 'John',
    last_name: 'Doe',
    email: 'test@paymee.tn',
    phone: '+21611222333',
    webhook_url: config.webhookUrl,
  };

  describe('createPayment', () => {
    it('returns token/payment_url on success and correctly maps the response data', async () => {
      request.mockReturnValueOnce(
        of({
          data: {
            status: true,
            message: 'Success',
            code: 50,
            data: {
              token: 'dfe54df34b54df3a854f3a53fc85a',
              order_id: '244557',
              amount: 220.25,
              payment_url:
                'https://sandbox.paymee.tn/gateway/dfe54df34b54df3a854f3a53fc85a',
            },
          },
        }),
      );

      const result = await client.createPayment(validPayload);

      expect(result).toEqual({
        token: 'dfe54df34b54df3a854f3a53fc85a',
        order_id: '244557',
        amount: 220.25,
        payment_url:
          'https://sandbox.paymee.tn/gateway/dfe54df34b54df3a854f3a53fc85a',
      });
      expect(request).toHaveBeenCalledTimes(1);
      const calledWith = request.mock.calls[0][0];
      expect(calledWith.headers.Authorization).toBe('Token test-api-key');
      expect(calledWith.method).toBe('POST');
      expect(calledWith.url).toBe('/payments/create');
    });

    it('throws PaymeeBadRequestError when Paymee responds with status: false', async () => {
      request.mockReturnValueOnce(
        of({
          data: {
            status: false,
            message: 'Invalid amount',
            code: 0,
            data: null,
          },
        }),
      );

      await expect(client.createPayment(validPayload)).rejects.toThrow(
        PaymeeBadRequestError,
      );
    });

    it('throws PaymeeInvalidResponseError when the response is missing expected fields', async () => {
      request.mockReturnValueOnce(
        of({ data: { status: true, message: 'Success', code: 50, data: {} } }),
      );

      await expect(client.createPayment(validPayload)).rejects.toThrow(
        PaymeeInvalidResponseError,
      );
    });

    it('never includes the API key in a thrown error message', async () => {
      request.mockReturnValue(throwError(() => axiosError(401)));

      await expect(client.createPayment(validPayload)).rejects.toThrow(
        PaymeeAuthenticationError,
      );

      try {
        await client.createPayment(validPayload);
      } catch (error) {
        expect(JSON.stringify(error)).not.toContain('test-api-key');
        expect((error as Error).message).not.toContain('test-api-key');
      }
    });

    it('maps a 401 response to PaymeeAuthenticationError with no retry', async () => {
      request.mockReturnValue(throwError(() => axiosError(401)));

      await expect(client.createPayment(validPayload)).rejects.toThrow(
        PaymeeAuthenticationError,
      );
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('maps a request timeout to PaymeeTimeoutError and retries a bounded number of times', async () => {
      jest.useFakeTimers();
      try {
        request.mockReturnValue(throwError(() => timeoutError()));

        const promise = client.createPayment(validPayload);
        const assertion = expect(promise).rejects.toThrow(PaymeeTimeoutError);

        await jest.runAllTimersAsync();
        await assertion;

        // initial attempt + 3 controlled retries = 4 total calls, never unbounded.
        expect(request).toHaveBeenCalledTimes(4);
      } finally {
        jest.useRealTimers();
      }
    });

    it('maps a network error (no response) to PaymeeNetworkError', async () => {
      jest.useFakeTimers();
      try {
        const networkError = new AxiosError('Network Error');
        request.mockReturnValue(throwError(() => networkError));

        const promise = client.createPayment(validPayload);
        const assertion = expect(promise).rejects.toThrow(PaymeeNetworkError);

        await jest.runAllTimersAsync();
        await assertion;
      } finally {
        jest.useRealTimers();
      }
    });

    it('retries a 429 with backoff and eventually throws PaymeeRateLimitError', async () => {
      jest.useFakeTimers();
      try {
        request.mockReturnValue(
          throwError(() => axiosError(429, {}, { 'retry-after': '0' })),
        );

        const promise = client.createPayment(validPayload);
        const assertion = expect(promise).rejects.toThrow(PaymeeRateLimitError);

        await jest.runAllTimersAsync();
        await assertion;

        expect(request).toHaveBeenCalledTimes(4);
      } finally {
        jest.useRealTimers();
      }
    });

    it('retries a 5xx with backoff and eventually throws PaymeeServerError', async () => {
      jest.useFakeTimers();
      try {
        request.mockReturnValue(throwError(() => axiosError(503)));

        const promise = client.createPayment(validPayload);
        const assertion = expect(promise).rejects.toThrow(PaymeeServerError);

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
                status: true,
                message: 'Success',
                code: 50,
                data: {
                  token: 'token-1',
                  order_id: '1',
                  amount: 220.25,
                  payment_url: 'https://sandbox.paymee.tn/gateway/token-1',
                },
              },
            }),
          );

        const promise = client.createPayment(validPayload);
        await jest.runAllTimersAsync();
        const result = await promise;

        expect(result.token).toBe('token-1');
        expect(request).toHaveBeenCalledTimes(2);
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
