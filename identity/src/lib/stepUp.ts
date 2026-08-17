import type { SsoUser } from "./session";

export const DEFAULT_STEP_UP_MAX_AGE_SECONDS = 10 * 60;

type StepUpEnv = { MFA_STEP_UP_MAX_AGE_SECONDS?: string };

export function getStepUpMaxAgeSeconds(env: StepUpEnv = process.env): number {
  const configured = Number(env.MFA_STEP_UP_MAX_AGE_SECONDS ?? DEFAULT_STEP_UP_MAX_AGE_SECONDS);
  return Number.isFinite(configured) && configured >= 60 && configured <= 60 * 60
    ? Math.floor(configured)
    : DEFAULT_STEP_UP_MAX_AGE_SECONDS;
}

export function hasRecentMfa(
  session: Pick<SsoUser, "mfaVerifiedAt">,
  maxAgeSeconds: number = getStepUpMaxAgeSeconds(),
  nowMs: number = Date.now(),
): boolean {
  const verifiedAt = session.mfaVerifiedAt;
  if (verifiedAt == null || !Number.isFinite(verifiedAt)) return false;
  const ageMs = nowMs - verifiedAt;
  return ageMs >= 0 && ageMs <= maxAgeSeconds * 1000;
}
