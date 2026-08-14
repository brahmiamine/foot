"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ListSearchInput } from "@/components/admin/ListSearchInput";
import { ListPagination } from "@/components/admin/ListPagination";
import { useConfirm } from "@/hooks/useConfirm";
import { useListFilter } from "@/hooks/useListFilter";
import { AGE_CATEGORY_LABELS, type AgeCategory } from "@/types/categories";
import { createNotification, deleteNotification } from "./actions";

type TargetType = "ALL" | "PLAYERS" | "STAFF" | "TEAM_MEMBERS";

interface NotificationData {
  id: number;
  title: string;
  message: string;
  targetType: TargetType;
  category: AgeCategory | null;
  isUrgent: boolean;
  matchLabel: string | null;
  createdAt: string;
}

interface MatchOption {
  id: string;
  label: string;
}

const TARGET_LABELS: Record<TargetType, string> = {
  ALL: "Tous les utilisateurs",
  PLAYERS: "Joueurs / parents",
  STAFF: "Staff uniquement",
  TEAM_MEMBERS: "Groupe équipe",
};

const TARGET_BADGES: Record<TargetType, string> = {
  ALL: "bg-primary-subtle text-primary",
  PLAYERS: "bg-success-subtle text-success",
  STAFF: "bg-info-subtle text-info",
  TEAM_MEMBERS: "bg-secondary-subtle text-secondary",
};

export function NotificationsManagement({
  initialNotifications,
  matches,
  allowedCategories,
  canSendGlobal,
}: {
  initialNotifications: NotificationData[];
  matches: MatchOption[];
  allowedCategories: readonly AgeCategory[];
  canSendGlobal: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const notifications = initialNotifications;
  const [showForm, setShowForm] = useState(false);
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [targetType, setTargetType] = useState<TargetType>(canSendGlobal ? "ALL" : "TEAM_MEMBERS");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirm();
  const {
    search,
    setSearch,
    page,
    setPage,
    totalPages,
    totalCount,
    items: visibleNotifications,
  } = useListFilter(notifications, {
    searchableText: (n) => `${n.title} ${n.message} ${n.matchLabel ?? ""}`,
  });

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
    if (!(await confirm("Supprimer ce message ?"))) return;
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
      {confirmDialog}
      <div className="d-flex justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h1 className="h4 mb-1">Communication</h1>
          <p className="text-muted mb-0">
            {canSendGlobal
              ? "Diffusez des messages au club entier, au staff, ou ciblés par catégorie."
              : "Diffusez des messages à votre groupe équipe (joueurs et parents de votre catégorie)."}
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          <i className="fas fa-plus me-2" aria-hidden="true" />
          {showForm ? "Annuler" : "Nouveau message"}
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
            <h5 className="card-title mb-0 text-primary">Nouveau message</h5>
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
              <div className="col-md-4">
                <label htmlFor="targetType" className="form-label">
                  Destinataires
                </label>
                <select id="targetType" name="targetType" className="form-select" value={targetType} onChange={(e) => setTargetType(e.target.value as TargetType)}>
                  {canSendGlobal && <option value="ALL">Tous les utilisateurs</option>}
                  <option value="PLAYERS">Joueurs / parents</option>
                  {canSendGlobal && <option value="STAFF">Staff uniquement</option>}
                  <option value="TEAM_MEMBERS">Groupe équipe</option>
                </select>
              </div>
              <div className="col-md-4">
                <label htmlFor="category" className="form-label">
                  Catégorie {!canSendGlobal && <span className="text-danger">*</span>}
                </label>
                <select id="category" name="category" className="form-select" required={!canSendGlobal} defaultValue={allowedCategories.length === 1 ? allowedCategories[0] : ""} disabled={allowedCategories.length === 1}>
                  {canSendGlobal && <option value="">Tout le club (aucune catégorie)</option>}
                  {allowedCategories.map((c) => (
                    <option key={c} value={c}>
                      {AGE_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
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
                <div className="form-check form-switch">
                  <input className="form-check-input" type="checkbox" id="isUrgent" name="isUrgent" />
                  <label className="form-check-label" htmlFor="isUrgent">
                    🚨 Notification urgente
                  </label>
                </div>
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
        <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
          <h5 className="card-title mb-0">Historique</h5>
          <ListSearchInput value={search} onChange={setSearch} placeholder="Rechercher un message..." />
        </div>
        <div className="card-body">
          {notifications.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted mb-0">Aucun message envoyé</p>
            </div>
          ) : totalCount === 0 ? (
            <p className="text-muted text-center py-5 mb-0">Aucun message ne correspond à votre recherche</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Titre</th>
                    <th>Message</th>
                    <th>Destinataires</th>
                    <th>Catégorie</th>
                    <th>Date</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleNotifications.map((n) => (
                    <tr key={n.id} className={n.isUrgent ? "table-danger" : undefined}>
                      <td className="fw-medium">
                        {n.isUrgent && <i className="fas fa-exclamation-triangle text-danger me-1" title="Urgent" aria-hidden="true" />}
                        {n.title}
                      </td>
                      <td className="text-truncate" style={{ maxWidth: "320px" }}>
                        {n.message}
                      </td>
                      <td>
                        <span className={`badge ${TARGET_BADGES[n.targetType]}`}>{TARGET_LABELS[n.targetType]}</span>
                      </td>
                      <td>{n.category ? <span className="badge bg-primary-subtle text-primary">{AGE_CATEGORY_LABELS[n.category]}</span> : <span className="text-muted small">Club entier</span>}</td>
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
              <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} totalCount={totalCount} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
