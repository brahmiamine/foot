export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

export interface EmailSendResult {
  providerMessageId?: string;
}

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');

/**
 * Abstraction fournisseur email (§15) : le reste du système ne connaît que
 * cette interface, jamais un SDK/API spécifique. Changer de fournisseur =
 * changer la valeur de EMAIL_PROVIDER (config `EMAIL_PROVIDER`), sans
 * toucher EmailChannel.
 */
export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<EmailSendResult>;
}
