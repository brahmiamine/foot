"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { apiErrorKey } from "@/i18n/apiErrors";

export default function ForgotPasswordForm() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const response = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(t(apiErrorKey(payload.error, "auth.password.forgotFailed")));
      }

      setMessage(t("auth.password.forgotSuccess"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.password.forgotFailed"));
    } finally {
      setLoading(false);
    }
  }

  if (message) {
    return (
      <div className="sso-form">
        <p className="sso-success">{message}</p>
        <Link href="/login" className="sso-switch">
          {t("auth.mfa.back")}
        </Link>
        <style jsx>{`
          .sso-form {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .sso-success {
            color: var(--sso-text);
            font-size: 0.9375rem;
            margin: 0;
          }
          .sso-switch {
            color: var(--sso-muted);
            font-size: 0.8125rem;
            text-decoration: underline;
          }
        `}</style>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="sso-form">
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

      {error && <p className="sso-error">{error}</p>}

      <button type="submit" disabled={loading} className="sso-submit">
        {loading ? t("auth.password.forgotSending") : t("auth.password.forgotSend")}
      </button>

      <Link href="/login" className="sso-switch">
        {t("auth.mfa.back")}
      </Link>

      <style jsx>{`
        .sso-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
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
          color: var(--sso-muted);
          font-size: 0.8125rem;
          text-decoration: underline;
        }
      `}</style>
    </form>
  );
}
