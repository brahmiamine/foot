"use client";

import { FormEvent, useState } from "react";
import { invitePlayerHubAccount } from "./account-actions";

export function PlayerAccountProvisioningCard({ playerId }: { playerId: string }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await invitePlayerHubAccount(playerId, new FormData(event.currentTarget));
      if (!result.success) {
        setError(result.error ?? "Impossible d'envoyer l'invitation");
        return;
      }
      setSuccess(result.message ?? "Invitation envoyée");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card mt-4">
      <div className="card-header bg-transparent">
        <h5 className="card-title mb-1">Accès Player Hub</h5>
        <p className="text-muted small mb-0">
          Le joueur recevra un lien personnel pour choisir son mot de passe. Aucun mot de passe temporaire n'est créé par le club.
        </p>
      </div>
      <div className="card-body">
        {error && <div className="alert alert-danger py-2">{error}</div>}
        {success && <div className="alert alert-success py-2">{success}</div>}
        <form onSubmit={handleSubmit} className="row g-3 align-items-end">
          <div className="col-md-8">
            <label htmlFor={`player-account-email-${playerId}`} className="form-label">
              Email personnel du joueur
            </label>
            <input
              id={`player-account-email-${playerId}`}
              type="email"
              name="email"
              className="form-control"
              autoComplete="email"
              maxLength={191}
              required
              placeholder="joueur@example.com"
            />
          </div>
          <div className="col-md-4">
            <button className="btn btn-outline-primary w-100" type="submit" disabled={saving}>
              {saving ? "Envoi..." : "Inviter / réinviter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
