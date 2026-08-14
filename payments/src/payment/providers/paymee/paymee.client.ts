import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import { paymeeConfig } from './paymee.config';
import {
  PaymeeAuthenticationError,
  PaymeeBadRequestError,
  PaymeeError,
  PaymeeInvalidResponseError,
  PaymeeNetworkError,
  PaymeeRateLimitError,
  PaymeeServerError,
  PaymeeTimeoutError,
} from './paymee.exceptions';
import {
  PaymeeCreatePaymentData,
  PaymeeCreatePaymentRequest,
  PaymeeCreatePaymentResponse,
} from './paymee.types';

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 5_000;

interface RequestContext {
  /** Human-readable operation name, for logs only (no sensitive data). */
  operation: string;
}

/**
 * Centralizes every HTTP call to Paymee. No other class in this codebase
 * should call Paymee directly. Responsible for: auth header injection,
 * timeouts, controlled retries, and translating transport/HTTP failures
 * into clean PaymeeError subclasses.
 */
@Injectable()
export class PaymeeClient {
  private readonly logger = new Logger(PaymeeClient.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(paymeeConfig.KEY)
    private readonly config: ConfigType<typeof paymeeConfig>,
  ) {}

  async createPayment(
    payload: PaymeeCreatePaymentRequest,
  ): Promise<PaymeeCreatePaymentData> {
    const response = await this.request<PaymeeCreatePaymentResponse>(
      { method: 'POST', url: '/payments/create', data: payload },
      { operation: 'create-payment' },
    );

    if (!response || typeof response.status !== 'boolean') {
      throw new PaymeeInvalidResponseError(
        'missing status in create-payment response',
      );
    }

    if (!response.status) {
      throw new PaymeeBadRequestError(this.extractSafeMessage(response));
    }

    const data = response.data;
    if (
      !data ||
      typeof data.token !== 'string' ||
      typeof data.payment_url !== 'string'
    ) {
      throw new PaymeeInvalidResponseError(
        'missing token/payment_url in create-payment response',
      );
    }

    return data;
  }

  private async request<T>(
    config: AxiosRequestConfig,
    context: RequestContext,
  ): Promise<T> {
    let attempt = 0;

    while (true) {
      attempt += 1;
      try {
        const response = await firstValueFrom(
          this.httpService.request<T>({
            ...config,
            baseURL: this.config.baseUrl,
            timeout: DEFAULT_TIMEOUT_MS,
            headers: {
              ...config.headers,
              Authorization: `Token ${this.config.apiKey}`,
              'Content-Type': 'application/json',
            },
          }),
        );
        return response.data;
      } catch (err) {
        const mapped = this.mapError(err as AxiosError);
        const shouldRetry = mapped.retryable && attempt <= MAX_RETRIES;

        this.logger.warn(
          `Paymee ${context.operation} failed (attempt ${attempt}/${MAX_RETRIES + 1}): ${mapped.code}` +
            (shouldRetry ? ' - retrying' : ' - giving up'),
        );

        if (!shouldRetry) {
          throw mapped;
        }

        const retryAfterMs =
          mapped instanceof PaymeeRateLimitError
            ? mapped.retryAfterMs
            : undefined;
        await this.delay(retryAfterMs ?? this.backoffDelay(attempt));
      }
    }
  }

  private mapError(err: AxiosError): PaymeeError {
    // Never let axios' internal error surface: it may carry the request
    // config (and therefore the Authorization header) via err.config/err.request.
    if (
      err.code === 'ECONNABORTED' ||
      err.message?.toLowerCase().includes('timeout')
    ) {
      return new PaymeeTimeoutError();
    }

    const response = err.response;
    if (!response) {
      return new PaymeeNetworkError();
    }

    switch (response.status) {
      case 401:
      case 403:
        return new PaymeeAuthenticationError();
      case 429: {
        const retryAfterHeader: unknown = response.headers?.['retry-after'];
        const retryAfterMs =
          typeof retryAfterHeader === 'string' ||
          typeof retryAfterHeader === 'number'
            ? Number(retryAfterHeader) * 1000
            : undefined;
        return new PaymeeRateLimitError(
          Number.isFinite(retryAfterMs) ? retryAfterMs : undefined,
        );
      }
      default:
        if (response.status >= 500) {
          return new PaymeeServerError(response.status);
        }
        if (response.status >= 400) {
          return new PaymeeBadRequestError(
            this.extractSafeMessage(response.data),
            response.status,
          );
        }
        return new PaymeeInvalidResponseError(
          `unexpected HTTP status ${response.status}`,
        );
    }
  }

  /** Paymee error bodies are untrusted input: only ever surface a short string, never the raw object. */
  private extractSafeMessage(data: unknown): string {
    if (data && typeof data === 'object' && 'message' in data) {
      const message = (data as Record<string, unknown>).message;
      if (typeof message === 'string' && message.length <= 300) {
        return message;
      }
    }
    return 'Paymee rejected the request as invalid.';
  }

  private backoffDelay(attempt: number): number {
    const exponential = BASE_BACKOFF_MS * 2 ** (attempt - 1);
    const jitter = Math.random() * BASE_BACKOFF_MS;
    return Math.min(exponential + jitter, MAX_BACKOFF_MS);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
