import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  GatewayTimeoutException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

/**
 * Clean, application-level errors for the Konnect integration.
 *
 * These are what the rest of the API (and ultimately the frontend) sees —
 * never a raw axios error, and never anything that could leak
 * KONNECT_API_KEY or other request/response internals.
 */
export abstract class KonnectError extends Error {
  abstract readonly code: string;
  /** Whether the caller may safely retry this exact operation. */
  abstract readonly retryable: boolean;
  /** Original HTTP status returned by Konnect, when known. */
  readonly httpStatus?: number;

  protected constructor(message: string, httpStatus?: number) {
    super(message);
    this.name = this.constructor.name;
    this.httpStatus = httpStatus;
  }
}

export class KonnectAuthenticationError extends KonnectError {
  readonly code = 'KONNECT_AUTHENTICATION_ERROR';
  readonly retryable = false;
  constructor() {
    super('Konnect rejected the request credentials.', 401);
  }
}

export class KonnectPaymentNotFoundError extends KonnectError {
  readonly code = 'KONNECT_PAYMENT_NOT_FOUND';
  readonly retryable = false;
  constructor(paymentId: string) {
    super(`Konnect payment ${paymentId} was not found.`, 404);
  }
}

export class KonnectBadRequestError extends KonnectError {
  readonly code = 'KONNECT_BAD_REQUEST';
  readonly retryable = false;
  constructor(
    message = 'Konnect rejected the request as invalid.',
    httpStatus = 400,
  ) {
    super(message, httpStatus);
  }
}

export class KonnectRateLimitError extends KonnectError {
  readonly code = 'KONNECT_RATE_LIMITED';
  readonly retryable = true;
  readonly retryAfterMs?: number;
  constructor(retryAfterMs?: number) {
    super('Konnect rate limit reached.', 429);
    this.retryAfterMs = retryAfterMs;
  }
}

export class KonnectServerError extends KonnectError {
  readonly code = 'KONNECT_SERVER_ERROR';
  readonly retryable = true;
  constructor(httpStatus: number) {
    super('Konnect returned a server error.', httpStatus);
  }
}

export class KonnectTimeoutError extends KonnectError {
  readonly code = 'KONNECT_TIMEOUT';
  readonly retryable = true;
  constructor() {
    super('Konnect request timed out.');
  }
}

export class KonnectNetworkError extends KonnectError {
  readonly code = 'KONNECT_NETWORK_ERROR';
  readonly retryable = true;
  constructor() {
    super('Could not reach Konnect.');
  }
}

export class KonnectInvalidResponseError extends KonnectError {
  readonly code = 'KONNECT_INVALID_RESPONSE';
  readonly retryable = false;
  constructor(reason: string) {
    super(`Konnect returned an unexpected response: ${reason}`);
  }
}

export class KonnectInvalidAmountError extends KonnectError {
  readonly code = 'KONNECT_INVALID_AMOUNT';
  readonly retryable = false;
  constructor(reason: string) {
    super(`Invalid amount for Konnect: ${reason}`);
  }
}

/** Thrown when a Konnect payment's amount/currency/orderId does not match our internal record. */
export class KonnectPaymentMismatchError extends KonnectError {
  readonly code = 'KONNECT_PAYMENT_MISMATCH';
  readonly retryable = false;
  constructor(reason: string) {
    super(`Konnect payment does not match the internal record: ${reason}`);
  }
}

/**
 * Translates an internal KonnectError into a safe HttpException for API
 * responses: message only, never the underlying cause, request config, or
 * API key.
 */
export function toHttpException(error: KonnectError): HttpException {
  if (error instanceof KonnectAuthenticationError) {
    return new InternalServerErrorException(
      'Payment provider authentication failed.',
    );
  }
  if (error instanceof KonnectPaymentNotFoundError) {
    return new NotFoundException(
      'Payment not found with the payment provider.',
    );
  }
  if (error instanceof KonnectPaymentMismatchError) {
    return new ConflictException(
      'Payment details do not match the payment provider.',
    );
  }
  if (
    error instanceof KonnectInvalidAmountError ||
    error instanceof KonnectBadRequestError
  ) {
    return new BadRequestException(error.message);
  }
  if (error instanceof KonnectRateLimitError) {
    return new ServiceUnavailableException(
      'Payment provider is temporarily unavailable.',
    );
  }
  if (error instanceof KonnectTimeoutError) {
    return new GatewayTimeoutException(
      'Payment provider did not respond in time.',
    );
  }
  if (
    error instanceof KonnectNetworkError ||
    error instanceof KonnectServerError
  ) {
    return new BadGatewayException(
      'Payment provider is temporarily unavailable.',
    );
  }
  return new InternalServerErrorException('Unexpected payment provider error.');
}
