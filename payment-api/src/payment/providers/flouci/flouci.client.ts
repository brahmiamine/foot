import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import { flouciConfig } from './flouci.config';
import {
  FlouciAuthenticationError,
  FlouciBadRequestError,
  FlouciError,
  FlouciInvalidResponseError,
  FlouciNetworkError,
  FlouciPaymentNotFoundError,
  FlouciRateLimitError,
  FlouciServerError,
  FlouciTimeoutError,
} from './flouci.exceptions';
import {
  FlouciGeneratePaymentRequest,
  FlouciGeneratePaymentResponse,
  FlouciGeneratePaymentResultData,
  FlouciVerifyPaymentResponse,
} from './flouci.types';

const DEFAULT_TIMEOUT_MS = 15_000;
// Kept small and bounded: Flouci's docs explicitly warn against repeated/
// looping verify_payment calls (rate limiting, possible IP blocks), so
// retries here only cover genuine transient transport failures, never a
// polling loop waiting for a status change.
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 5_000;

interface RequestContext {
  /** Human-readable operation name, for logs only (no sensitive data). */
  operation: string;
  /** Built when Flouci returns 404, so callers get a precise domain error. */
  notFound?: () => FlouciError;
}

/**
 * Centralizes every HTTP call to Flouci. No other class in this codebase
 * should call Flouci directly. Responsible for: auth header injection,
 * timeouts, controlled retries, and translating transport/HTTP failures
 * into clean FlouciError subclasses.
 */
@Injectable()
export class FlouciClient {
  private readonly logger = new Logger(FlouciClient.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(flouciConfig.KEY)
    private readonly config: ConfigType<typeof flouciConfig>,
  ) {}

  async generatePayment(
    payload: FlouciGeneratePaymentRequest,
  ): Promise<FlouciGeneratePaymentResultData> {
    const data = await this.request<FlouciGeneratePaymentResponse>(
      { method: 'POST', url: '/api/v2/generate_payment', data: payload },
      { operation: 'generate-payment' },
    );

    if (!data || !data.result) {
      throw new FlouciInvalidResponseError(
        'missing result in generate-payment response',
      );
    }

    if (!data.result.success) {
      throw new FlouciBadRequestError(
        'Flouci rejected the payment generation request.',
      );
    }

    if (
      typeof data.result.payment_id !== 'string' ||
      typeof data.result.link !== 'string'
    ) {
      throw new FlouciInvalidResponseError(
        'missing payment_id/link in generate-payment response',
      );
    }

    return data.result;
  }

  async verifyPayment(paymentId: string): Promise<FlouciVerifyPaymentResponse> {
    const data = await this.request<FlouciVerifyPaymentResponse>(
      {
        method: 'GET',
        url: `/api/v2/verify_payment/${encodeURIComponent(paymentId)}`,
      },
      {
        operation: 'verify-payment',
        notFound: () => new FlouciPaymentNotFoundError(paymentId),
      },
    );

    if (!data || !data.result || typeof data.result.status !== 'string') {
      throw new FlouciInvalidResponseError(
        'missing result.status in verify-payment response',
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
              Authorization: `Bearer ${this.config.publicKey}:${this.config.privateKey}`,
              'Content-Type': 'application/json',
            },
          }),
        );
        return response.data;
      } catch (err) {
        const mapped = this.mapError(err as AxiosError, context);
        const shouldRetry = mapped.retryable && attempt <= MAX_RETRIES;

        this.logger.warn(
          `Flouci ${context.operation} failed (attempt ${attempt}/${MAX_RETRIES + 1}): ${mapped.code}` +
            (shouldRetry ? ' - retrying' : ' - giving up'),
        );

        if (!shouldRetry) {
          throw mapped;
        }

        const retryAfterMs =
          mapped instanceof FlouciRateLimitError
            ? mapped.retryAfterMs
            : undefined;
        await this.delay(retryAfterMs ?? this.backoffDelay(attempt));
      }
    }
  }

  private mapError(err: AxiosError, context: RequestContext): FlouciError {
    // Never let axios' internal error surface: it may carry the request
    // config (and therefore the Authorization header) via err.config/err.request.
    if (
      err.code === 'ECONNABORTED' ||
      err.message?.toLowerCase().includes('timeout')
    ) {
      return new FlouciTimeoutError();
    }

    const response = err.response;
    if (!response) {
      return new FlouciNetworkError();
    }

    switch (response.status) {
      case 401:
      case 403:
        return new FlouciAuthenticationError();
      case 404:
        return context.notFound
          ? context.notFound()
          : new FlouciBadRequestError('Flouci resource not found.', 404);
      case 429: {
        const retryAfterHeader: unknown = response.headers?.['retry-after'];
        const retryAfterMs =
          typeof retryAfterHeader === 'string' ||
          typeof retryAfterHeader === 'number'
            ? Number(retryAfterHeader) * 1000
            : undefined;
        return new FlouciRateLimitError(
          Number.isFinite(retryAfterMs) ? retryAfterMs : undefined,
        );
      }
      default:
        if (response.status >= 500) {
          return new FlouciServerError(response.status);
        }
        if (response.status >= 400) {
          return new FlouciBadRequestError(
            this.extractSafeMessage(response.data),
            response.status,
          );
        }
        return new FlouciInvalidResponseError(
          `unexpected HTTP status ${response.status}`,
        );
    }
  }

  /** Flouci error bodies are untrusted input: only ever surface a short string, never the raw object. */
  private extractSafeMessage(data: unknown): string {
    if (data && typeof data === 'object' && 'message' in data) {
      const message = (data as Record<string, unknown>).message;
      if (typeof message === 'string' && message.length <= 300) {
        return message;
      }
    }
    return 'Flouci rejected the request as invalid.';
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
