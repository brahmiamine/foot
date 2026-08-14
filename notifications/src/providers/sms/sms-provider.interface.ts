export interface SmsMessage {
  to: string;
  body: string;
}

export const SMS_PROVIDER = Symbol('SMS_PROVIDER');

/** Abstraction fournisseur SMS — hors périmètre V1 (§36), interface préparée uniquement. */
export interface SmsProvider {
  readonly name: string;
  send(message: SmsMessage): Promise<void>;
}
