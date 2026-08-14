import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GatewayTimeoutException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

/**
 * Clean, application-level errors for the Paymee integration.
 *
 * These are what the rest of the API (and ultimately the frontend) sees —
 * never a raw axios error, and never anything that could leak
 * PAYMEE_API_KEY or other request/response internals.
 */
export abstract class PaymeeError extends Error {
  abstract readonly code: string;
  /** Whether the caller may safely retry this exact operation. */
  abstract readonly retryable: boolean;
  /** Original HTTP status returned by Paymee, when known. */
  readonly httpStatus?: number;

  protected constructor(message: string, httpStatus?: number) {
    super(message);
    this.name = this.constructor.name;
    this.httpStatus = httpStatus;
  }
}

export class PaymeeAuthenticationError extends PaymeeError {
  readonly code = 'PAYMEE_AUTHENTICATION_ERROR';
  readonly retryable = false;
  constructor() {
    super('Paymee rejected the request credentials.', 401);
  }
}

export class PaymeeBadRequestError extends PaymeeError {
  readonly code = 'PAYMEE_BAD_REQUEST';
  readonly retryable = false;
  constructor(
    message = 'Paymee rejected the request as invalid.',
    httpStatus = 400,
  ) {
    super(message, httpStatus);
  }
}

export class PaymeeRateLimitError extends PaymeeError {
  readonly code = 'PAYMEE_RATE_LIMITED';
  readonly retryable = true;
  readonly retryAfterMs?: number;
  constructor(retryAfterMs?: number) {
    super('Paymee rate limit reached.', 429);
    this.retryAfterMs = retryAfterMs;
  }
}

export class PaymeeServerError extends PaymeeError {
  readonly code = 'PAYMEE_SERVER_ERROR';
  readonly retryable = true;
  constructor(httpStatus: number) {
    super('Paymee returned a server error.', httpStatus);
  }
}

export class PaymeeTimeoutError extends PaymeeError {
  readonly code = 'PAYMEE_TIMEOUT';
  readonly retryable = true;
  constructor() {
    super('Paymee request timed out.');
  }
}

export class PaymeeNetworkError extends PaymeeError {
  readonly code = 'PAYMEE_NETWORK_ERROR';
  readonly retryable = true;
  constructor() {
    super('Could not reach Paymee.');
  }
}

export class PaymeeInvalidResponseError extends PaymeeError {
  readonly code = 'PAYMEE_INVALID_RESPONSE';
  readonly retryable = false;
  constructor(reason: string) {
    super(`Paymee returned an unexpected response: ${reason}`);
  }
}

export class PaymeeInvalidAmountError extends PaymeeError {
  readonly code = 'PAYMEE_INVALID_AMOUNT';
  readonly retryable = false;
  constructor(reason: string) {
    super(`Invalid amount for Paymee: ${reason}`);
  }
}

/** Thrown when a Paymee webhook's amount or order_id does not match our internal record. */
export class PaymeePaymentMismatchError extends PaymeeError {
  readonly code = 'PAYMEE_PAYMENT_MISMATCH';
  readonly retryable = false;
  constructor(reason: string) {
    super(`Paymee payment does not match the internal record: ${reason}`);
  }
}

/** Thrown when a webhook's check_sum does not match the one we compute. Never trust the payload past this point. */
export class PaymeeChecksumInvalidError extends PaymeeError {
  readonly code = 'PAYMEE_CHECKSUM_INVALID';
  readonly retryable = false;
  constructor() {
    super('Paymee webhook check_sum is invalid.');
  }
}

/** Thrown when a webhook references a token with no matching internal payment. */
export class PaymeePaymentNotFoundError extends PaymeeError {
  readonly code = 'PAYMEE_PAYMENT_NOT_FOUND';
  readonly retryable = false;
  constructor() {
    super('No internal payment found for this Paymee token.');
  }
}

/**
 * Translates an internal PaymeeError into a safe HttpException for API
 * responses: message only, never the underlying cause, request config, or
 * API key.
 */
export function toHttpException(error: PaymeeError): HttpException {
  if (error instanceof PaymeeAuthenticationError) {
    return new InternalServerErrorException(
      'Payment provider authentication failed.',
    );
  }
  if (error instanceof PaymeeChecksumInvalidError) {
    return new ForbiddenException(
      'Payment notification could not be verified.',
    );
  }
  if (error instanceof PaymeePaymentNotFoundError) {
    return new NotFoundException('Payment not found for this notification.');
  }
  if (error instanceof PaymeePaymentMismatchError) {
    return new ConflictException(
      'Payment details do not match the payment provider.',
    );
  }
  if (
    error instanceof PaymeeInvalidAmountError ||
    error instanceof PaymeeBadRequestError
  ) {
    return new BadRequestException(error.message);
  }
  if (error instanceof PaymeeRateLimitError) {
    return new ServiceUnavailableException(
      'Payment provider is temporarily unavailable.',
    );
  }
  if (error instanceof PaymeeTimeoutError) {
    return new GatewayTimeoutException(
      'Payment provider did not respond in time.',
    );
  }
  if (
    error instanceof PaymeeNetworkError ||
    error instanceof PaymeeServerError
  ) {
    return new BadGatewayException(
      'Payment provider is temporarily unavailable.',
    );
  }
  return new InternalServerErrorException('Unexpected payment provider error.');
}
