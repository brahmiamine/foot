"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

const ERROR_MESSAGES: Record<string, string> = {
  google: "La connexion avec Google a échoué. Réessayez.",
  google_unverified: "Votre compte Google doit avoir un email vérifié.",
  staff_email: "Cet email est déjà utilisé par un compte interne. Contactez un administrateur.",
};

export default function MemberLoginForm({
  redirectTo,
  initialError,
}: {
  redirectTo: string;
  initialError?: string | null;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    initialError ? ERROR_MESSAGES[initialError] ?? "Connexion impossible." : null
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
        throw new Error(payload.error || "Email ou mot de passe incorrect");
      }

      window.location.href = payload.redirect || "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de se connecter");
    } finally {
      setLoading(false);
    }
  }

  const googleHref = `/api/auth/google?redirect=${encodeURIComponent(redirectTo)}`;

  return (
    <form onSubmit={handleSubmit} className="sso-form">
      <a href={googleHref} className="sso-google">
        Continuer avec Google
      </a>

      <div className="sso-divider">
        <span>ou</span>
      </div>

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

      <Link href={`/membre/register?redirect=${encodeURIComponent(redirectTo)}`} className="sso-switch">
        Pas encore de compte ? Inscrivez-vous
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
