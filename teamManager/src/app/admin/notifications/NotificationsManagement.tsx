"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createNotification, deleteNotification } from "./actions";

interface NotificationData {
  id: number;
  title: string;
  message: string;
  targetType: "ALL" | "PLAYERS" | "STAFF" | "TEAM_MEMBERS";
  matchLabel: string | null;
  createdAt: string;
}

interface MatchOption {
  id: string;
  label: string;
}

const TARGET_LABELS: Record<NotificationData["targetType"], string> = {
  ALL: "Tous les utilisateurs",
  PLAYERS: "Joueurs uniquement",
  STAFF: "Staff uniquement",
  TEAM_MEMBERS: "Membres de l'équipe",
};

const TARGET_BADGES: Record<NotificationData["targetType"], string> = {
  ALL: "bg-primary-subtle text-primary",
  PLAYERS: "bg-success-subtle text-success",
  STAFF: "bg-info-subtle text-info",
  TEAM_MEMBERS: "bg-secondary-subtle text-secondary",
};

export function NotificationsManagement({
  initialNotifications,
  matches,
}: {
  initialNotifications: NotificationData[];
  matches: MatchOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const notifications = initialNotifications;
  const [showForm, setShowForm] = useState(false);
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      const formData = new FormData(e.currentTarget);
      const result = await createNotification(formData);
      if (result.success) {
        setSuccess(result.message ?? null);
        setShowForm(false);
        (e.target as HTMLFormElement).reset();
        startTransition(() => router.refresh());
      } else {
        setError(result.error || "Erreur lors de l'envoi");
      }
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer cette notification ?")) return;
    setDeletingId(id);
    setError(null);
    try {
      const result = await deleteNotification(id);
      if (result.success) {
        startTransition(() => router.refresh());
      } else {
        setError(result.error || "Erreur lors de la suppression");
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="container-fluid px-0">
      <div className="d-flex justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h1 className="h4 mb-1">Notifications</h1>
          <p className="text-muted mb-0">Diffusez des annonces aux joueurs, au staff ou à tout le club.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          <i className="fas fa-plus me-2" aria-hidden="true" />
          {showForm ? "Annuler" : "Nouvelle notification"}
        </button>
      </div>

      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-start mb-4">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Fermer" className="btn-close" />
        </div>
      )}
      {success && (
        <div className="alert alert-success d-flex justify-content-between align-items-start mb-4">
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess(null)} aria-label="Fermer" className="btn-close" />
        </div>
      )}

      {showForm && (
        <div className="card border border-primary mb-4">
          <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
            <h5 className="card-title mb-0 text-primary">Nouvelle notification</h5>
            <button type="button" onClick={() => setShowForm(false)} className="btn-close" aria-label="Fermer" />
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="row g-3">
              <div className="col-12">
                <label htmlFor="title" className="form-label">
                  Titre
                </label>
                <input id="title" name="title" type="text" className="form-control" required maxLength={200} />
              </div>
              <div className="col-12">
                <label htmlFor="message" className="form-label">
                  Message
                </label>
                <textarea id="message" name="message" className="form-control" rows={3} required />
              </div>
              <div className="col-md-6">
                <label htmlFor="targetType" className="form-label">
                  Destinataires
                </label>
                <select id="targetType" name="targetType" className="form-select" defaultValue="ALL">
                  <option value="ALL">Tous les utilisateurs</option>
                  <option value="PLAYERS">Joueurs uniquement</option>
                  <option value="STAFF">Staff uniquement</option>
                  <option value="TEAM_MEMBERS">Membres de l&apos;équipe</option>
                </select>
              </div>
              <div className="col-md-6">
                <label htmlFor="matchId" className="form-label">
                  Match lié (optionnel)
                </label>
                <select id="matchId" name="matchId" className="form-select" defaultValue="">
                  <option value="">Aucun</option>
                  {matches.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12">
                <button type="submit" className="btn btn-primary" disabled={sending}>
                  {sending ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                      Envoi...
                    </>
                  ) : (
                    "Envoyer"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h5 className="card-title mb-0">Historique des notifications</h5>
        </div>
        <div className="card-body">
          {notifications.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted mb-0">Aucune notification envoyée</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Titre</th>
                    <th>Message</th>
                    <th>Destinataires</th>
                    <th>Match</th>
                    <th>Date</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {notifications.map((n) => (
                    <tr key={n.id}>
                      <td className="fw-medium">{n.title}</td>
                      <td className="text-truncate" style={{ maxWidth: "320px" }}>
                        {n.message}
                      </td>
                      <td>
                        <span className={`badge ${TARGET_BADGES[n.targetType]}`}>{TARGET_LABELS[n.targetType]}</span>
                      </td>
                      <td>{n.matchLabel ?? "—"}</td>
                      <td>{new Date(n.createdAt).toLocaleDateString("fr-TN")}</td>
                      <td className="text-end">
                        <button
                          type="button"
                          onClick={() => handleDelete(n.id)}
                          disabled={deletingId === n.id || isPending}
                          className="btn btn-sm btn-outline-danger"
                        >
                          {deletingId === n.id ? (
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                          ) : (
                            <i className="fas fa-trash" aria-hidden="true" />
                          )}
                          <span className="visually-hidden">Supprimer</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
