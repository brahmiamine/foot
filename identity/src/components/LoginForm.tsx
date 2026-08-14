"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { apiErrorKey } from "@/i18n/apiErrors";

interface TeamOption {
  id: string;
  nom: string;
  nomAr: string | null;
  logoUrl: string | null;
}

export default function LoginForm({ redirectTo }: { redirectTo: string }) {
  const { locale, t } = useI18n();
  const [mode, setMode] = useState<"club" | "federation-hub" | "official">("club");
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  useEffect(() => {
    fetch("/api/teams")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: TeamOption[]) => setTeams(data))
      .catch(() => setTeams([]))
      .finally(() => setLoadingTeams(false));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (mode === "club" && !selectedTeamId) {
      setError(t("auth.clubSelection.required"));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          teamId: mode === "club" ? selectedTeamId : null,
          redirect: redirectTo,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(t(apiErrorKey(payload.error, "auth.login.invalidCredentials")));
      }

      if (payload.mfaRequired) {
        setMfaToken(payload.mfaToken);
        return;
      }

      window.location.href = payload.redirect || "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.login.unavailable"));
    } finally {
      setLoading(false);
    }
  }

  async function handleMfaSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/login/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mfaToken, code: mfaCode, redirect: redirectTo }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(t(apiErrorKey(payload.error, "auth.mfa.invalid")));
      }

      window.location.href = payload.redirect || "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.mfa.invalid"));
    } finally {
      setLoading(false);
    }
  }

  if (mfaToken) {
    return (
      <form onSubmit={handleMfaSubmit} className="sso-form">
        <div className="sso-field">
          <label htmlFor="mfaCode">{t("auth.mfa.code.label")}</label>
          <input
            id="mfaCode"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder={t("auth.mfa.code.placeholder")}
            value={mfaCode}
            onChange={(event) => setMfaCode(event.target.value)}
            autoFocus
            required
          />
        </div>

        {error && <p className="sso-error">{error}</p>}

        <button type="submit" disabled={loading} className="sso-submit">
          {loading ? t("auth.mfa.verifying") : t("auth.mfa.verify")}
        </button>

        <button
          type="button"
          className="sso-switch"
          onClick={() => {
            setMfaToken(null);
            setMfaCode("");
            setError(null);
          }}
        >
          {t("auth.mfa.back")}
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
            background: none;
            border: none;
            color: var(--sso-muted);
            font-size: 0.8125rem;
            cursor: pointer;
            text-decoration: underline;
          }
        `}</style>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="sso-form">
      <div className="sso-mode-selector" aria-label={t("auth.login.accountType")}>
        <button type="button" className={mode === "club" ? "active" : ""} onClick={() => { setMode("club"); setError(null); }}>{t("auth.login.club")}</button>
        <button type="button" className={mode === "federation-hub" ? "active" : ""} onClick={() => { setMode("federation-hub"); setError(null); }}>{t("auth.login.federation")}</button>
        <button type="button" className={mode === "official" ? "active" : ""} onClick={() => { setMode("official"); setError(null); }}>{t("auth.login.official")}</button>
      </div>
      {mode === "club" && (
        <div className="sso-field">
          <label htmlFor="teamId">{t("auth.clubSelection.label")}</label>
          <select
            id="teamId"
            value={selectedTeamId}
            onChange={(event) => setSelectedTeamId(event.target.value)}
            required
          >
            <option value="">
              {loadingTeams ? t("common.loading") : t("auth.clubSelection.select")}
            </option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {locale === "ar" && team.nomAr ? team.nomAr : team.nom}
              </option>
            ))}
          </select>
        </div>
      )}

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

      <Link href="/forgot-password" className="sso-switch sso-switch-link">
        {t("auth.password.forgot")}
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
        .sso-mode-selector {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 4px;
          padding: 4px;
          border: 1px solid var(--sso-border);
          border-radius: 9px;
          background: var(--sso-bg);
        }
        .sso-mode-selector button {
          border: 0;
          border-radius: 6px;
          padding: 8px 4px;
          background: transparent;
          color: var(--sso-muted);
          font-size: 0.72rem;
          cursor: pointer;
        }
        .sso-mode-selector button.active {
          background: var(--sso-card);
          color: var(--sso-accent);
          font-weight: 700;
          box-shadow: 0 2px 7px rgba(0, 0, 0, 0.08);
        }
        .sso-field label {
          font-size: 0.8125rem;
          color: var(--sso-muted);
        }
        .sso-field input,
        .sso-field select {
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
        .sso-switch-link {
          width: fit-content;
        }
        .sso-switch {
          background: none;
          border: none;
          color: var(--sso-muted);
          font-size: 0.8125rem;
          cursor: pointer;
          text-decoration: underline;
        }
      `}</style>
    </form>
  );
}
