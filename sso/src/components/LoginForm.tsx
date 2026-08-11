"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

interface TeamOption {
  id: string;
  nom: string;
  nomAr: string | null;
  logoUrl: string | null;
}

export default function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [mode, setMode] = useState<"club" | "superadmin">("club");
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
      setError("Choisissez votre club.");
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
        throw new Error(payload.error || "Identifiants incorrects");
      }

      if (payload.mfaRequired) {
        setMfaToken(payload.mfaToken);
        return;
      }

      window.location.href = payload.redirect || "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de se connecter");
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
        throw new Error(payload.error || "Code invalide");
      }

      window.location.href = payload.redirect || "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Code invalide");
    } finally {
      setLoading(false);
    }
  }

  if (mfaToken) {
    return (
      <form onSubmit={handleMfaSubmit} className="sso-form">
        <div className="sso-field">
          <label htmlFor="mfaCode">Code de vérification</label>
          <input
            id="mfaCode"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456 ou code de récupération"
            value={mfaCode}
            onChange={(event) => setMfaCode(event.target.value)}
            autoFocus
            required
          />
        </div>

        {error && <p className="sso-error">{error}</p>}

        <button type="submit" disabled={loading} className="sso-submit">
          {loading ? "Vérification..." : "Vérifier"}
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
          Retour à la connexion
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
      {mode === "club" && (
        <div className="sso-field">
          <label htmlFor="teamId">Club</label>
          <select
            id="teamId"
            value={selectedTeamId}
            onChange={(event) => setSelectedTeamId(event.target.value)}
            required
          >
            <option value="">
              {loadingTeams ? "Chargement..." : "Sélectionnez un club"}
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
        <label htmlFor="email">Email</label>
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
        <label htmlFor="password">Mot de passe</label>
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
        {loading ? "Connexion..." : "Se connecter"}
      </button>

      <Link href="/forgot-password" className="sso-switch sso-switch-link">
        Mot de passe oublié ?
      </Link>

      <button
        type="button"
        className="sso-switch"
        onClick={() => {
          setMode(mode === "club" ? "superadmin" : "club");
          setError(null);
        }}
      >
        {mode === "club" ? "Connexion super-admin" : "Retour à la connexion club"}
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
