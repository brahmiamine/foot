import type { TranslationKey } from "./index";

export const API_ERROR_KEYS: Record<string, TranslationKey> = {
  FORBIDDEN: "common.error.forbidden",
  UNAUTHENTICATED: "common.error.unauthenticated",
  RATE_LIMITED: "common.error.rateLimited",
  SERVER_ERROR: "common.error.server",
  INVALID_CREDENTIALS: "auth.login.invalidCredentials",
  CURRENT_PASSWORD_REQUIRED: "auth.password.currentRequired",
  PASSWORD_TOO_SHORT: "auth.password.tooShort",
  INVALID_CURRENT_PASSWORD: "auth.password.currentInvalid",
  ACCOUNT_DISABLED: "auth.password.accountDisabled",
  EMAIL_REQUIRED: "auth.password.emailRequired",
  MFA_CODE_REQUIRED: "auth.mfa.required",
  MFA_CODE_INVALID: "auth.mfa.invalid",
  MFA_SESSION_EXPIRED: "auth.mfa.sessionExpired",
  MFA_ENROLLMENT_EXPIRED: "auth.mfa.enrollmentExpired",
};

export function apiErrorKey(code: unknown, fallback: TranslationKey): TranslationKey {
  return typeof code === "string" ? API_ERROR_KEYS[code] ?? fallback : fallback;
}
