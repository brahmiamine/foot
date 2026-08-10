"use client";

import { useState } from "react";
import Link from "next/link";

interface NotificationDto {
  id: number;
  title: string;
  body: string;
  url: string | null;
  isUrgent: boolean;
  readAt: string | null;
  createdAt: string;
}

interface Props {
  initialNotifications: NotificationDto[];
  initialEmailEnabled: boolean;
}

/** Liste complète des notifications de l'utilisateur + toggle préférence email. */
export function NotificationCenterList({ initialNotifications, initialEmailEnabled }: Props) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [emailEnabled, setEmailEnabled] = useState(initialEmailEnabled);
  const [savingPreference, setSavingPreference] = useState(false);

  const markRead = async (id: number) => {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
  };

  const markAllRead = async () => {
    await fetch("/api/notifications/read-all", { method: "POST" });
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
  };

  const toggleEmailEnabled = async () => {
    const next = !emailEnabled;
    setSavingPreference(true);
    setEmailEnabled(next);
    try {
      await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailEnabled: next }),
      });
    } finally {
      setSavingPreference(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <h1 className="h4 mb-0">Mes notifications</h1>
          <p className="text-muted small mb-0">{unreadCount} non lue{unreadCount > 1 ? "s" : ""}</p>
        </div>
        <div className="d-flex align-items-center gap-3">
          <div className="form-check form-switch mb-0">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="emailEnabledSwitch"
              checked={emailEnabled}
              disabled={savingPreference}
              onChange={toggleEmailEnabled}
            />
            <label className="form-check-label small" htmlFor="emailEnabledSwitch">
              Recevoir aussi par email
            </label>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="btn btn-outline-secondary btn-sm">
              Tout marquer lu
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 && <div className="card"><div className="card-body text-muted">Aucune notification pour le moment.</div></div>}

      <div className="d-flex flex-column gap-2">
        {notifications.map((n) => (
          <div
            key={n.id}
            className="card"
            style={{ background: n.readAt ? undefined : "#fef2f2", borderLeft: n.isUrgent ? "4px solid #ce1126" : undefined }}
          >
            <div className="card-body py-2">
              <div className="d-flex align-items-start justify-content-between gap-2">
                <div>
                  <p className="mb-1 fw-semibold">
                    {n.title} {n.isUrgent && <span className="badge bg-danger ms-1">Urgent</span>}
                  </p>
                  <p className="mb-1 text-muted">{n.body}</p>
                  {n.url && (
                    <Link href={n.url} className="small" onClick={() => !n.readAt && markRead(n.id)}>
                      Voir le détail
                    </Link>
                  )}
                </div>
                {!n.readAt && (
                  <button onClick={() => markRead(n.id)} className="btn btn-link btn-sm text-nowrap p-0">
                    Marquer lu
                  </button>
                )}
              </div>
              <p className="mb-0 text-muted mt-1" style={{ fontSize: "0.75rem" }}>
                {new Date(n.createdAt).toLocaleString("fr-FR")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
