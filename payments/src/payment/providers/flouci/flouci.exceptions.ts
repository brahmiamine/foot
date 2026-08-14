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
 * Clean, application-level errors for the Flouci integration.
 *
 * These are what the rest of the API (and ultimately the frontend) sees —
 * never a raw axios error, and never anything that could leak
 * FLOUCI_PRIVATE_KEY or other request/response internals.
 */
export abstract class FlouciError extends Error {
  abstract readonly code: string;
  /** Whether the caller may safely retry this exact operation. */
  abstract readonly retryable: boolean;
  /** Original HTTP status returned by Flouci, when known. */
  readonly httpStatus?: number;

  protected constructor(message: string, httpStatus?: number) {
    super(message);
    this.name = this.constructor.name;
    this.httpStatus = httpStatus;
  }
}

export class FlouciAuthenticationError extends FlouciError {
  readonly code = 'FLOUCI_AUTHENTICATION_ERROR';
  readonly retryable = false;
  constructor() {
    super('Flouci rejected the request credentials.', 401);
  }
}

export class FlouciPaymentNotFoundError extends FlouciError {
  readonly code = 'FLOUCI_PAYMENT_NOT_FOUND';
  readonly retryable = false;
  constructor(paymentId: string) {
    super(`Flouci payment ${paymentId} was not found.`, 404);
  }
}

export class FlouciBadRequestError extends FlouciError {
  readonly code = 'FLOUCI_BAD_REQUEST';
  readonly retryable = false;
  constructor(
    message = 'Flouci rejected the request as invalid.',
    httpStatus = 400,
  ) {
    super(message, httpStatus);
  }
}

export class FlouciRateLimitError extends FlouciError {
  readonly code = 'FLOUCI_RATE_LIMITED';
  readonly retryable = true;
  readonly retryAfterMs?: number;
  constructor(retryAfterMs?: number) {
    super('Flouci rate limit reached.', 429);
    this.retryAfterMs = retryAfterMs;
  }
}

export class FlouciServerError extends FlouciError {
  readonly code = 'FLOUCI_SERVER_ERROR';
  readonly retryable = true;
  constructor(httpStatus: number) {
    super('Flouci returned a server error.', httpStatus);
  }
}

export class FlouciTimeoutError extends FlouciError {
  readonly code = 'FLOUCI_TIMEOUT';
  readonly retryable = true;
  constructor() {
    super('Flouci request timed out.');
  }
}

export class FlouciNetworkError extends FlouciError {
  readonly code = 'FLOUCI_NETWORK_ERROR';
  readonly retryable = true;
  constructor() {
    super('Could not reach Flouci.');
  }
}

export class FlouciInvalidResponseError extends FlouciError {
  readonly code = 'FLOUCI_INVALID_RESPONSE';
  readonly retryable = false;
  constructor(reason: string) {
    super(`Flouci returned an unexpected response: ${reason}`);
  }
}

export class FlouciInvalidAmountError extends FlouciError {
  readonly code = 'FLOUCI_INVALID_AMOUNT';
  readonly retryable = false;
  constructor(reason: string) {
    super(`Invalid amount for Flouci: ${reason}`);
  }
}

/** Thrown when a verified Flouci payment's amount/developer_tracking_id does not match our internal record. */
export class FlouciPaymentMismatchError extends FlouciError {
  readonly code = 'FLOUCI_PAYMENT_MISMATCH';
  readonly retryable = false;
  constructor(reason: string) {
    super(`Flouci payment does not match the internal record: ${reason}`);
  }
}

/**
 * Translates an internal FlouciError into a safe HttpException for API
 * responses: message only, never the underlying cause, request config, or
 * API credentials.
 */
export function toHttpException(error: FlouciError): HttpException {
  if (error instanceof FlouciAuthenticationError) {
    return new InternalServerErrorException(
      'Payment provider authentication failed.',
    );
  }
  if (error instanceof FlouciPaymentNotFoundError) {
    return new NotFoundException(
      'Payment not found with the payment provider.',
    );
  }
  if (error instanceof FlouciPaymentMismatchError) {
    return new ConflictException(
      'Payment details do not match the payment provider.',
    );
  }
  if (
    error instanceof FlouciInvalidAmountError ||
    error instanceof FlouciBadRequestError
  ) {
    return new BadRequestException(error.message);
  }
  if (error instanceof FlouciRateLimitError) {
    return new ServiceUnavailableException(
      'Payment provider is temporarily unavailable.',
    );
  }
  if (error instanceof FlouciTimeoutError) {
    return new GatewayTimeoutException(
      'Payment provider did not respond in time.',
    );
  }
  if (
    error instanceof FlouciNetworkError ||
    error instanceof FlouciServerError
  ) {
    return new BadGatewayException(
      'Payment provider is temporarily unavailable.',
    );
  }
  return new InternalServerErrorException('Unexpected payment provider error.');
}
