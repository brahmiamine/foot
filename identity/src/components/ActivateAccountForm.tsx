"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ActivateAccountForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/account-invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Impossible d'activer le compte");
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'activer le compte");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="sso-form">
        <p className="sso-success">Votre compte est activé. Vous pouvez maintenant vous connecter à votre espace joueur.</p>
        <Link href="/joueur/login" className="sso-submit sso-submit-link">
          Se connecter à l'espace joueur
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="sso-form">
      <div className="sso-field">
        <label htmlFor="password">Choisir un mot de passe</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <div className="sso-field">
        <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      {error && <p className="sso-error">{error}</p>}
      <button type="submit" disabled={loading} className="sso-submit">
        {loading ? "Activation..." : "Activer mon compte"}
      </button>
      <style jsx>{`
        .sso-form { display: flex; flex-direction: column; gap: 16px; }
        .sso-field { display: flex; flex-direction: column; gap: 6px; }
        .sso-field label { font-size: 0.8125rem; color: var(--sso-muted); }
        .sso-field input {
          background: var(--sso-bg); border: 1px solid var(--sso-border); border-radius: 8px;
          padding: 10px 12px; color: var(--sso-text); font-size: 0.9375rem;
        }
        .sso-error { color: var(--sso-error); font-size: 0.875rem; margin: 0; }
        .sso-success { color: var(--sso-text); font-size: 0.9375rem; margin: 0; }
        .sso-submit {
          background: var(--sso-accent); color: white; border: none; border-radius: 8px;
          padding: 12px; font-weight: 600; cursor: pointer;
        }
        .sso-submit:hover:not(:disabled) { background: var(--sso-accent-hover); }
        .sso-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .sso-submit-link { display: block; text-align: center; text-decoration: none; }
      `}</style>
    </form>
  );
}
