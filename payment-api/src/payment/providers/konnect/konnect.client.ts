import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import { konnectConfig } from './konnect.config';
import {
  KonnectAuthenticationError,
  KonnectBadRequestError,
  KonnectError,
  KonnectInvalidResponseError,
  KonnectNetworkError,
  KonnectPaymentNotFoundError,
  KonnectRateLimitError,
  KonnectServerError,
  KonnectTimeoutError,
} from './konnect.exceptions';
import {
  KonnectGetPaymentResponse,
  KonnectInitPaymentRequest,
  KonnectInitPaymentResponse,
} from './konnect.types';

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 5_000;

interface RequestContext {
  /** Human-readable operation name, for logs only (no sensitive data). */
  operation: string;
  /** Built when Konnect returns 404, so callers get a precise domain error. */
  notFound?: () => KonnectError;
}

/**
 * Centralizes every HTTP call to Konnect. No other class in this codebase
 * should call Konnect directly. Responsible for: auth header injection,
 * timeouts, controlled retries, and translating transport/HTTP failures
 * into clean KonnectError subclasses.
 */
@Injectable()
export class KonnectClient {
  private readonly logger = new Logger(KonnectClient.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(konnectConfig.KEY)
    private readonly config: ConfigType<typeof konnectConfig>,
  ) {}

  async initPayment(
    payload: KonnectInitPaymentRequest,
  ): Promise<KonnectInitPaymentResponse> {
    const data = await this.request<KonnectInitPaymentResponse>(
      { method: 'POST', url: '/payments/init-payment', data: payload },
      { operation: 'init-payment' },
    );

    if (
      !data ||
      typeof data.payUrl !== 'string' ||
      typeof data.paymentRef !== 'string'
    ) {
      throw new KonnectInvalidResponseError(
        'missing payUrl/paymentRef in init-payment response',
      );
    }

    return data;
  }

  async getPaymentDetails(
    paymentId: string,
  ): Promise<KonnectGetPaymentResponse> {
    const data = await this.request<KonnectGetPaymentResponse>(
      { method: 'GET', url: `/payments/${encodeURIComponent(paymentId)}` },
      {
        operation: 'get-payment-details',
        notFound: () => new KonnectPaymentNotFoundError(paymentId),
      },
    );

    if (!data || !data.payment || typeof data.payment.status !== 'string') {
      throw new KonnectInvalidResponseError(
        'missing payment.status in get-payment-details response',
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
              'x-api-key': this.config.apiKey,
              'Content-Type': 'application/json',
            },
          }),
        );
        return response.data;
      } catch (err) {
        const mapped = this.mapError(err as AxiosError, context);
        const shouldRetry = mapped.retryable && attempt <= MAX_RETRIES;

        this.logger.warn(
          `Konnect ${context.operation} failed (attempt ${attempt}/${MAX_RETRIES + 1}): ${mapped.code}` +
            (shouldRetry ? ' - retrying' : ' - giving up'),
        );

        if (!shouldRetry) {
          throw mapped;
        }

        const retryAfterMs =
          mapped instanceof KonnectRateLimitError
            ? mapped.retryAfterMs
            : undefined;
        await this.delay(retryAfterMs ?? this.backoffDelay(attempt));
      }
    }
  }

  private mapError(err: AxiosError, context: RequestContext): KonnectError {
    // Never let axios' internal error surface: it may carry the request
    // config (and therefore the x-api-key header) via err.config/err.request.
    if (
      err.code === 'ECONNABORTED' ||
      err.message?.toLowerCase().includes('timeout')
    ) {
      return new KonnectTimeoutError();
    }

    const response = err.response;
    if (!response) {
      return new KonnectNetworkError();
    }

    switch (response.status) {
      case 401:
      case 403:
        return new KonnectAuthenticationError();
      case 404:
        return context.notFound
          ? context.notFound()
          : new KonnectBadRequestError('Konnect resource not found.', 404);
      case 429: {
        const retryAfterHeader: unknown = response.headers?.['retry-after'];
        const retryAfterMs =
          typeof retryAfterHeader === 'string' ||
          typeof retryAfterHeader === 'number'
            ? Number(retryAfterHeader) * 1000
            : undefined;
        return new KonnectRateLimitError(
          Number.isFinite(retryAfterMs) ? retryAfterMs : undefined,
        );
      }
      default:
        if (response.status >= 500) {
          return new KonnectServerError(response.status);
        }
        if (response.status >= 400) {
          return new KonnectBadRequestError(
            this.extractSafeMessage(response.data),
            response.status,
          );
        }
        return new KonnectInvalidResponseError(
          `unexpected HTTP status ${response.status}`,
        );
    }
  }

  /** Konnect error bodies are untrusted input: only ever surface a short string, never the raw object. */
  private extractSafeMessage(data: unknown): string {
    if (data && typeof data === 'object' && 'message' in data) {
      const message = (data as Record<string, unknown>).message;
      if (typeof message === 'string' && message.length <= 300) {
        return message;
      }
    }
    return 'Konnect rejected the request as invalid.';
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
