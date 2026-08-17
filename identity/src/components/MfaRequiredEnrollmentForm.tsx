"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { apiErrorKey } from "@/i18n/apiErrors";

type Stage = "intro" | "confirm" | "recovery";

export default function MfaRequiredEnrollmentForm({
  mfaToken,
  redirectTo,
  onBack,
}: {
  mfaToken: string;
  redirectTo: string;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const [stage, setStage] = useState<Stage>("intro");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [finalRedirect, setFinalRedirect] = useState(redirectTo || "/");

  async function startEnrollment() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/login/mfa/enroll/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mfaToken }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(t(apiErrorKey(payload.error, "auth.mfa.startFailed")));
      }
      setQrCodeDataUrl(payload.qrCodeDataUrl);
      setStage("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.mfa.startFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function confirmEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/login/mfa/enroll/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mfaToken, code, redirect: redirectTo }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(t(apiErrorKey(payload.error, "auth.mfa.invalid")));
      }
      setRecoveryCodes(Array.isArray(payload.recoveryCodes) ? payload.recoveryCodes : []);
      setFinalRedirect(payload.redirect || redirectTo || "/");
      setStage("recovery");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.mfa.invalid"));
    } finally {
      setLoading(false);
    }
  }

  if (stage === "recovery") {
    return (
      <div className="sso-form">
        <p className="sso-text">{t("auth.mfa.recovery")}</p>
        <pre className="sso-codes">{recoveryCodes.join("\n")}</pre>
        <button type="button" className="sso-submit" onClick={() => { window.location.href = finalRedirect; }}>
          {t("auth.mfa.savedCodes")}
        </button>
        <style jsx>{`
          .sso-form { display: flex; flex-direction: column; gap: 16px; }
          .sso-text { color: var(--sso-text); margin: 0; font-size: 0.9375rem; }
          .sso-codes { background: var(--sso-bg); border: 1px solid var(--sso-border); border-radius: 8px; padding: 12px; line-height: 1.6; }
          .sso-submit { background: var(--sso-accent); color: white; border: 0; border-radius: 8px; padding: 12px; font-weight: 600; cursor: pointer; }
        `}</style>
      </div>
    );
  }

  if (stage === "confirm") {
    return (
      <form onSubmit={confirmEnrollment} className="sso-form">
        <p className="sso-muted">{t("auth.mfa.scan")}</p>
        {qrCodeDataUrl && <Image src={qrCodeDataUrl} alt={t("auth.mfa.qrAlt")} width={200} height={200} unoptimized />}
        <div className="sso-field">
          <label htmlFor="requiredMfaCode">{t("auth.mfa.code.label")}</label>
          <input id="requiredMfaCode" type="text" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} required autoFocus />
        </div>
        {error && <p className="sso-error">{error}</p>}
        <button type="submit" disabled={loading} className="sso-submit">
          {loading ? t("auth.mfa.verifying") : t("auth.mfa.confirm")}
        </button>
        <style jsx>{`
          .sso-form { display: flex; flex-direction: column; gap: 16px; }
          .sso-muted { color: var(--sso-muted); margin: 0; font-size: 0.875rem; }
          .sso-field { display: flex; flex-direction: column; gap: 6px; }
          .sso-field label { font-size: 0.8125rem; color: var(--sso-muted); }
          .sso-field input { background: var(--sso-bg); border: 1px solid var(--sso-border); border-radius: 8px; padding: 10px 12px; color: var(--sso-text); }
          .sso-error { color: var(--sso-error); margin: 0; font-size: 0.875rem; }
          .sso-submit { background: var(--sso-accent); color: white; border: 0; border-radius: 8px; padding: 12px; font-weight: 600; cursor: pointer; }
          .sso-submit:disabled { opacity: .6; cursor: not-allowed; }
        `}</style>
      </form>
    );
  }

  return (
    <div className="sso-form">
      <p className="sso-muted">{t("auth.mfa.scan")}</p>
      {error && <p className="sso-error">{error}</p>}
      <button type="button" disabled={loading} className="sso-submit" onClick={startEnrollment}>
        {loading ? t("common.loading") : t("auth.mfa.start")}
      </button>
      <button type="button" className="sso-switch" onClick={onBack}>{t("auth.mfa.back")}</button>
      <style jsx>{`
        .sso-form { display: flex; flex-direction: column; gap: 16px; }
        .sso-muted { color: var(--sso-muted); margin: 0; font-size: 0.875rem; }
        .sso-error { color: var(--sso-error); margin: 0; font-size: 0.875rem; }
        .sso-submit { background: var(--sso-accent); color: white; border: 0; border-radius: 8px; padding: 12px; font-weight: 600; cursor: pointer; }
        .sso-submit:disabled { opacity: .6; cursor: not-allowed; }
        .sso-switch { background: none; border: none; color: var(--sso-muted); text-decoration: underline; cursor: pointer; }
      `}</style>
    </div>
  );
}
