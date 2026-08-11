"use client";

import { FormEvent, useEffect, useState } from "react";

interface TeamOption {
  id: string;
  nom: string;
}

export default function InviteStaffForm({
  isSuperAdmin,
  ownTeamId,
}: {
  isSuperAdmin: boolean;
  ownTeamId: string | null;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "OBSERVATEUR">("OBSERVATEUR");
  const [teamId, setTeamId] = useState(ownTeamId ?? "");
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetch("/api/teams")
      .then((response) => response.json())
      .then((data: TeamOption[]) => setTeams(data))
      .catch(() => setTeams([]));
  }, [isSuperAdmin]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, teamId }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Impossible d'envoyer l'invitation");
      }

      setSuccess(true);
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'envoyer l'invitation");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="sso-form">
      <div className="sso-field">
        <label htmlFor="email">Email de la personne invitée</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </div>

      {isSuperAdmin ? (
        <>
          <div className="sso-field">
            <label htmlFor="teamId">Club</label>
            <select id="teamId" value={teamId} onChange={(event) => setTeamId(event.target.value)} required>
              <option value="">— Choisir un club —</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.nom}
                </option>
              ))}
            </select>
          </div>
          <div className="sso-field">
            <label htmlFor="role">Rôle</label>
            <select id="role" value={role} onChange={(event) => setRole(event.target.value as "ADMIN" | "OBSERVATEUR")}>
              <option value="OBSERVATEUR">Membre (OBSERVATEUR)</option>
              <option value="ADMIN">Administrateur du club (ADMIN)</option>
            </select>
          </div>
        </>
      ) : (
        <p className="sso-muted">
          Invitation pour votre club, avec le rôle « Membre » — seul un SUPERADMIN peut inviter un autre administrateur.
        </p>
      )}

      {error && <p className="sso-error">{error}</p>}
      {success && <p className="sso-success">Invitation envoyée.</p>}

      <button type="submit" disabled={loading} className="sso-submit">
        {loading ? "Envoi..." : "Envoyer l'invitation"}
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
        .sso-muted {
          color: var(--sso-muted);
          font-size: 0.8125rem;
          margin: 0;
        }
        .sso-error {
          color: var(--sso-error);
          font-size: 0.875rem;
          margin: 0;
        }
        .sso-success {
          color: var(--sso-text);
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
