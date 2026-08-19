"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function MemberRegisterForm({
  redirectTo,
  teamId,
  invitationToken,
}: {
  redirectTo: string;
  teamId: string | null;
  invitationToken: string | null;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          phoneNumber: phoneNumber || undefined,
          redirect: redirectTo,
          teamId: teamId || undefined,
          invitationToken: invitationToken || undefined,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Inscription impossible");
      }

      if (payload.status === "PENDING_EMAIL_VERIFICATION") {
        setMessage("Vérifiez votre boîte email pour finaliser votre inscription.");
        return;
      }
      if (payload.status === "PENDING_CLUB_APPROVAL") {
        setMessage("Votre demande a été envoyée au club pour approbation.");
        return;
      }
      window.location.href = payload.redirect || "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer le compte");
    } finally {
      setLoading(false);
    }
  }

  const googleParams = new URLSearchParams({ redirect: redirectTo });
  if (teamId) googleParams.set("teamId", teamId);
  if (invitationToken) googleParams.set("invite", invitationToken);
  const googleHref = `/api/auth/google?${googleParams.toString()}`;

  const loginParams = new URLSearchParams({ redirect: redirectTo });
  if (teamId) loginParams.set("teamId", teamId);

  return (
    <form onSubmit={handleSubmit} className="sso-form">
      <a href={googleHref} className="sso-google">
        Continuer avec Google
      </a>

      <div className="sso-divider">
        <span>ou</span>
      </div>

      <div className="sso-field">
        <label htmlFor="name">Nom</label>
        <input id="name" type="text" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
      </div>

      <div className="sso-field">
        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
      </div>

      <div className="sso-field">
        <label htmlFor="password">Mot de passe</label>
        <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} required />
      </div>

      <p className="sso-hint">
        Optionnel — utile pour payer par Paymee (ticketing) plus tard. Vous pourrez aussi les renseigner ensuite depuis votre profil.
      </p>

      <div className="sso-field">
        <label htmlFor="firstName">Prénom (optionnel)</label>
        <input id="firstName" type="text" value={firstName} onChange={(event) => setFirstName(event.target.value)} autoComplete="given-name" />
      </div>

      <div className="sso-field">
        <label htmlFor="lastName">Nom de famille (optionnel)</label>
        <input id="lastName" type="text" value={lastName} onChange={(event) => setLastName(event.target.value)} autoComplete="family-name" />
      </div>

      <div className="sso-field">
        <label htmlFor="phoneNumber">Téléphone (optionnel)</label>
        <input id="phoneNumber" type="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} autoComplete="tel" />
      </div>

      {error && <p className="sso-error">{error}</p>}
      {message && <p className="sso-success">{message}</p>}

      <button type="submit" disabled={loading || Boolean(message)} className="sso-submit">
        {loading ? "Création..." : "Créer mon compte"}
      </button>

      <Link href={`/membre/login?${loginParams.toString()}`} className="sso-switch">
        Déjà un compte ? Connectez-vous
      </Link>

      <style jsx>{`
        .sso-form { display: flex; flex-direction: column; gap: 16px; }
        .sso-google { display: block; text-align: center; background: var(--sso-bg); border: 1px solid var(--sso-border); border-radius: 8px; padding: 12px; color: var(--sso-text); font-weight: 600; text-decoration: none; }
        .sso-google:hover { border-color: var(--sso-accent); }
        .sso-divider { display: flex; align-items: center; gap: 12px; color: var(--sso-muted); font-size: 0.8125rem; }
        .sso-divider::before, .sso-divider::after { content: ""; flex: 1; height: 1px; background: var(--sso-border); }
        .sso-field { display: flex; flex-direction: column; gap: 6px; }
        .sso-field label { font-size: 0.8125rem; color: var(--sso-muted); }
        .sso-field input { background: var(--sso-bg); border: 1px solid var(--sso-border); border-radius: 8px; padding: 10px 12px; color: var(--sso-text); font-size: 0.9375rem; }
        .sso-error { color: var(--sso-error); font-size: 0.875rem; margin: 0; }
        .sso-success { color: var(--sso-success, #198754); font-size: 0.875rem; margin: 0; }
        .sso-hint { color: var(--sso-muted); font-size: 0.8125rem; margin: -4px 0 0; }
        .sso-submit { background: var(--sso-accent); color: white; border: none; border-radius: 8px; padding: 12px; font-weight: 600; cursor: pointer; }
        .sso-submit:hover:not(:disabled) { background: var(--sso-accent-hover); }
        .sso-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .sso-switch { text-align: center; color: var(--sso-muted); font-size: 0.8125rem; text-decoration: underline; }
      `}</style>
    </form>
  );
}