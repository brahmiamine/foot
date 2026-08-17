"use client";

import { FormEvent, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { apiErrorKey } from "@/i18n/apiErrors";

export default function MfaStepUpForm({ redirectTo }: { redirectTo: string }) {
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/mfa/step-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, redirect: redirectTo }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(t(apiErrorKey(payload.error, "auth.mfa.invalid")));
      }
      window.location.href = payload.redirect || redirectTo || "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.mfa.invalid"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="sso-form">
      <div className="sso-field">
        <label htmlFor="stepUpCode">{t("auth.mfa.code.label")}</label>
        <input
          id="stepUpCode"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder={t("auth.mfa.code.placeholder")}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          required
          autoFocus
        />
      </div>
      {error && <p className="sso-error">{error}</p>}
      <button type="submit" disabled={loading} className="sso-submit">
        {loading ? t("auth.mfa.verifying") : t("auth.mfa.verify")}
      </button>
      <style jsx>{`
        .sso-form { display: flex; flex-direction: column; gap: 16px; }
        .sso-field { display: flex; flex-direction: column; gap: 6px; }
        .sso-field label { font-size: 0.8125rem; color: var(--sso-muted); }
        .sso-field input { background: var(--sso-bg); border: 1px solid var(--sso-border); border-radius: 8px; padding: 10px 12px; color: var(--sso-text); font-size: 0.9375rem; }
        .sso-error { color: var(--sso-error); font-size: 0.875rem; margin: 0; }
        .sso-submit { background: var(--sso-accent); color: white; border: 0; border-radius: 8px; padding: 12px; font-weight: 600; cursor: pointer; }
        .sso-submit:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </form>
  );
}
