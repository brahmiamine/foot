"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { apiErrorKey } from "@/i18n/apiErrors";
import type { TranslationKey } from "@/i18n";

const ERROR_MESSAGES: Record<string, TranslationKey> = {
  google: "auth.login.googleError",
  google_unverified: "auth.login.googleUnverified",
  staff_email: "auth.login.staffEmail",
};

export default function MemberLoginForm({
  redirectTo,
  initialError,
}: {
  redirectTo: string;
  initialError?: string | null;
}) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    initialError ? t(ERROR_MESSAGES[initialError] ?? "auth.login.unavailable") : null
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, redirect: redirectTo }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(t(apiErrorKey(payload.error, "auth.login.invalidCredentials")));
      }

      window.location.href = payload.redirect || "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.login.unavailable"));
    } finally {
      setLoading(false);
    }
  }

  const googleHref = `/api/auth/google?redirect=${encodeURIComponent(redirectTo)}`;

  return (
    <form onSubmit={handleSubmit} className="sso-form">
      <a href={googleHref} className="sso-google">
        {t("auth.login.google")}
      </a>

      <div className="sso-divider">
        <span>{t("common.or")}</span>
      </div>

      <div className="sso-field">
        <label htmlFor="email">{t("common.email")}</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </div>

      <div className="sso-field">
        <label htmlFor="password">{t("auth.password.label")}</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />
      </div>

      {error && <p className="sso-error">{error}</p>}

      <button type="submit" disabled={loading} className="sso-submit">
        {loading ? t("auth.login.pending") : t("auth.login.submit")}
      </button>

      <Link href={`/membre/register?redirect=${encodeURIComponent(redirectTo)}`} className="sso-switch">
        {t("auth.login.registerPrompt")}
      </Link>

      <style jsx>{`
        .sso-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .sso-google {
          display: block;
          text-align: center;
          background: var(--sso-bg);
          border: 1px solid var(--sso-border);
          border-radius: 8px;
          padding: 12px;
          color: var(--sso-text);
          font-weight: 600;
          text-decoration: none;
        }
        .sso-google:hover {
          border-color: var(--sso-accent);
        }
        .sso-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--sso-muted);
          font-size: 0.8125rem;
        }
        .sso-divider::before,
        .sso-divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: var(--sso-border);
        }
        .sso-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .sso-field label {
          font-size: 0.8125rem;
          color: var(--sso-muted);
        }
        .sso-field input {
          background: var(--sso-bg);
          border: 1px solid var(--sso-border);
          border-radius: 8px;
          padding: 10px 12px;
          color: var(--sso-text);
          font-size: 0.9375rem;
        }
        .sso-error {
          color: var(--sso-error);
          font-size: 0.875rem;
          margin: 0;
        }
        .sso-submit {
          background: var(--sso-accent);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .sso-submit:hover:not(:disabled) {
          background: var(--sso-accent-hover);
        }
        .sso-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .sso-switch {
          text-align: center;
          color: var(--sso-muted);
          font-size: 0.8125rem;
          text-decoration: underline;
        }
      `}</style>
    </form>
  );
}
