"use client";

import { FormEvent, useState } from "react";

export default function MemberProfileForm({
  initialFirstName,
  initialLastName,
  initialPhoneNumber,
  redirectTo,
}: {
  initialFirstName: string;
  initialLastName: string;
  initialPhoneNumber: string;
  redirectTo: string | null;
}) {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setLoading(true);
    try {
      const response = await fetch("/api/members/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, phoneNumber }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Mise à jour impossible");
      }

      if (redirectTo) {
        window.location.href = redirectTo;
        return;
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour impossible");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="sso-form">
      <div className="sso-field">
        <label htmlFor="firstName">Prénom</label>
        <input
          id="firstName"
          type="text"
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
          autoComplete="given-name"
        />
      </div>

      <div className="sso-field">
        <label htmlFor="lastName">Nom de famille</label>
        <input
          id="lastName"
          type="text"
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
          autoComplete="family-name"
        />
      </div>

      <div className="sso-field">
        <label htmlFor="phoneNumber">Téléphone</label>
        <input
          id="phoneNumber"
          type="tel"
          value={phoneNumber}
          onChange={(event) => setPhoneNumber(event.target.value)}
          autoComplete="tel"
        />
      </div>

      {error && <p className="sso-error">{error}</p>}
      {saved && !error && <p className="sso-saved">Profil enregistré.</p>}

      <button type="submit" disabled={loading} className="sso-submit">
        {loading ? "Enregistrement..." : "Enregistrer"}
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
        .sso-saved {
          color: var(--sso-accent);
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
