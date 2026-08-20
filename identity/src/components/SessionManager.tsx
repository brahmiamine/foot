"use client";

import { useState } from "react";

type SessionRow = {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  current: boolean;
};

function deviceLabel(userAgent: string | null): string {
  if (!userAgent) return "Appareil inconnu";

  const platform = /iPhone/i.test(userAgent)
    ? "iPhone"
    : /iPad/i.test(userAgent)
      ? "iPad"
      : /Android/i.test(userAgent)
        ? "Android"
        : /Windows/i.test(userAgent)
          ? "Windows"
          : /Mac OS X|Macintosh/i.test(userAgent)
            ? "macOS"
            : /Linux/i.test(userAgent)
              ? "Linux"
              : "Appareil";

  const browser = /Edg\//i.test(userAgent)
    ? "Edge"
    : /Firefox\//i.test(userAgent)
      ? "Firefox"
      : /Chrome\//i.test(userAgent)
        ? "Chrome"
        : /Safari\//i.test(userAgent)
          ? "Safari"
          : "Navigateur";

  return `${browser} · ${platform}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function SessionManager({ initialSessions }: { initialSessions: SessionRow[] }) {
  const [sessions, setSessions] = useState(initialSessions);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function revoke(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const response = await fetch(`/api/account/sessions/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const body = (await response.json()) as { current?: boolean; error?: string };
      if (!response.ok) {
        throw new Error(body.error || "Impossible de révoquer cette session.");
      }
      if (body.current) {
        window.location.assign("/login");
        return;
      }
      setSessions((current) => current.filter((session) => session.id !== id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de révoquer cette session.");
    } finally {
      setBusyId(null);
    }
  }

  async function revokeAll() {
    setBusyId("all");
    setError(null);
    try {
      const response = await fetch("/api/logout-everywhere", { method: "POST" });
      if (!response.ok) throw new Error("Impossible de déconnecter toutes les sessions.");
      window.location.assign("/login");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de déconnecter toutes les sessions.");
      setBusyId(null);
    }
  }

  return (
    <div className="session-manager">
      {error && <p className="session-error" role="alert">{error}</p>}
      {sessions.length === 0 ? (
        <p className="session-muted">Aucune session enregistrée. Les anciens jetons sans identifiant de session expirent automatiquement.</p>
      ) : (
        <ul className="session-list">
          {sessions.map((session) => (
            <li key={session.id} className="session-item">
              <div className="session-main">
                <div className="session-title">
                  <strong>{deviceLabel(session.userAgent)}</strong>
                  {session.current && <span className="session-badge">Session actuelle</span>}
                </div>
                <span className="session-muted">
                  Dernière activité {formatDate(session.lastSeenAt)}
                  {session.ipAddress ? ` · IP ${session.ipAddress}` : ""}
                </span>
                <span className="session-muted">
                  Créée {formatDate(session.createdAt)} · expire {formatDate(session.expiresAt)}
                </span>
              </div>
              <button
                type="button"
                className="session-revoke"
                disabled={busyId !== null}
                onClick={() => revoke(session.id)}
              >
                {busyId === session.id ? "Déconnexion…" : "Déconnecter"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        className="session-all"
        disabled={busyId !== null}
        onClick={revokeAll}
      >
        {busyId === "all" ? "Déconnexion…" : "Déconnecter tous les appareils"}
      </button>

      <style jsx>{`
        .session-manager { display: flex; flex-direction: column; gap: 16px; }
        .session-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
        .session-item { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 16px; border: 1px solid var(--sso-border); border-radius: 10px; }
        .session-main { min-width: 0; display: flex; flex-direction: column; gap: 5px; }
        .session-title { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 0.9375rem; }
        .session-badge { padding: 2px 7px; border-radius: 999px; background: color-mix(in srgb, var(--sso-accent) 14%, transparent); color: var(--sso-accent); font-size: 0.7rem; font-weight: 600; }
        .session-muted { color: var(--sso-muted); font-size: 0.75rem; overflow-wrap: anywhere; }
        .session-revoke, .session-all { border: 1px solid var(--sso-border); border-radius: 8px; background: transparent; color: inherit; cursor: pointer; font: inherit; font-size: 0.8125rem; padding: 8px 10px; }
        .session-revoke:hover:not(:disabled), .session-all:hover:not(:disabled) { border-color: var(--sso-accent); color: var(--sso-accent); }
        .session-all { align-self: flex-start; color: #b42318; }
        button:disabled { cursor: wait; opacity: 0.55; }
        .session-error { margin: 0; color: #b42318; font-size: 0.8125rem; }
        @media (max-width: 560px) { .session-item { flex-direction: column; } .session-revoke { width: 100%; } }
      `}</style>
    </div>
  );
}
