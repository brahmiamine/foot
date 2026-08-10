"use client";

import { FormEvent, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface TeamOption {
  id: string;
  nom: string;
  nomAr: string | null;
  logoUrl: string | null;
}

export default function LoginForm({ redirectTo }: { redirectTo: string }) {
  const t = useTranslations("login");
  const [mode, setMode] = useState<"club" | "superadmin">("club");
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      setError(t("errors.chooseClub"));
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
        throw new Error(payload.error || t("errors.invalidCredentials"));
      }

      window.location.href = payload.redirect || "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.cannotConnect"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="sso-form">
      {mode === "club" && (
        <div className="sso-field">
          <label htmlFor="teamId">{t("clubLabel")}</label>
          <select
            id="teamId"
            value={selectedTeamId}
            onChange={(event) => setSelectedTeamId(event.target.value)}
            required
          >
            <option value="">
              {loadingTeams ? t("clubLoading") : t("clubPlaceholder")}
            </option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.nom}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="sso-field">
        <label htmlFor="email">{t("emailLabel")}</label>
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
        <label htmlFor="password">{t("passwordLabel")}</label>
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
        {loading ? t("submitting") : t("submit")}
      </button>

      <button
        type="button"
        className="sso-switch"
        onClick={() => {
          setMode(mode === "club" ? "superadmin" : "club");
          setError(null);
        }}
      >
        {mode === "club" ? t("switchToSuperadmin") : t("switchToClub")}
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
        .sso-field input,
        .sso-field select {
          background: var(--sso-bg);
          border: 1px solid var(--sso-border);
          border-radius: 8px;
          padding: 10px 12px;
          color: var(--sso-text);
          font-size: 0.9375rem;
          text-align: start;
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
