"use client";

import { FormEvent, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { apiErrorKey } from "@/i18n/apiErrors";

export default function ChangePasswordForm() {
  const { t } = useI18n();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword.length < 8) {
      setError(t("auth.password.tooShort", { count: 8 }));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(t(apiErrorKey(payload.error, "auth.password.changeFailed"), { count: 8 }));
      }
      setCurrentPassword("");
      setNewPassword("");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.password.changeFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="sso-form">
      <div className="sso-field">
        <label htmlFor="currentPassword">{t("auth.password.current")}</label>
        <input
          id="currentPassword"
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          autoComplete="current-password"
          required
        />
      </div>

      <div className="sso-field">
        <label htmlFor="newPassword">{t("auth.password.new")}</label>
        <input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

      {error && <p className="sso-error">{error}</p>}
      {success && <p className="sso-success">{t("auth.password.changed")}</p>}

      <button type="submit" disabled={loading} className="sso-submit">
        {loading ? t("auth.password.changing") : t("auth.password.change")}
      </button>

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
        .sso-success {
          color: var(--sso-success, #2e7d32);
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
      `}</style>
    </form>
  );
}
