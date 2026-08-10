"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/hooks/useConfirm";
import { useListFilter } from "@/hooks/useListFilter";
import { ListSearchInput } from "@/components/admin/ListSearchInput";
import { ListPagination } from "@/components/admin/ListPagination";
import { DOCUMENT_ENTITY_TYPES, DOCUMENT_CATEGORIES, DOCUMENT_CATEGORY_LABELS } from "@/types/documents";
import { createDocument, deleteDocument } from "./actions";

type EntityType = (typeof DOCUMENT_ENTITY_TYPES)[number];

interface DocumentData {
  id: number;
  entityType: string;
  entityId: string;
  entityLabel: string;
  category: string;
  title: string;
  fileUrl: string;
  issuedAt: string | null;
  expiresAt: string | null;
  notes: string | null;
}

interface PersonOption {
  id: string;
  label: string;
}

interface ExpiringItem {
  source: "LICENSE" | "DOCUMENT";
  id: number;
  label: string;
  entityType: string;
  entityId: string;
  expiresAt: string;
  isExpired: boolean;
}

function expirationBadge(expiresAt: string | null): { label: string; className: string } | null {
  if (!expiresAt) return null;
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: "🔴 Expiré", className: "bg-danger-subtle text-danger" };
  if (days <= 7) return { label: `🔴 Expire dans ${days} j`, className: "bg-danger-subtle text-danger" };
  if (days <= 30) return { label: `🟠 Expire dans ${days} j`, className: "bg-warning-subtle text-warning" };
  return null;
}

const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  PLAYER: "Joueur",
  STAFF: "Staff",
  LICENSE: "Licence",
  INJURY: "Blessure",
  GUARDIAN: "Parent/tuteur",
  TEAM: "Club",
  OTHER: "Autre",
};

export function DocumentsManagement({
  initialDocuments,
  expiringItems,
  players,
  staff,
  canManage,
}: {
  initialDocuments: DocumentData[];
  expiringItems: ExpiringItem[];
  players: PersonOption[];
  staff: PersonOption[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { confirm, confirmDialog } = useConfirm();

  const [showForm, setShowForm] = useState(false);
  const [entityType, setEntityType] = useState<EntityType>("PLAYER");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { search, setSearch, page, setPage, totalPages, totalCount, items: visibleDocuments } = useListFilter(initialDocuments, {
    searchableText: (d) => `${d.title} ${d.entityLabel} ${DOCUMENT_CATEGORY_LABELS[d.category as keyof typeof DOCUMENT_CATEGORY_LABELS] ?? ""}`,
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      const result = await createDocument(formData);
      if (result.success) {
        setSuccess(result.message ?? null);
        setShowForm(false);
        (e.target as HTMLFormElement).reset();
        startTransition(() => router.refresh());
      } else {
        setError(result.error || "Erreur");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (document: DocumentData) => {
    if (!(await confirm(`Supprimer le document "${document.title}" ?`))) return;
    const result = await deleteDocument(document.id);
    if (result.success) {
      startTransition(() => router.refresh());
    } else {
      setError(result.error || "Erreur lors de la suppression");
    }
  };

  return (
    <div className="container-fluid px-0">
      {confirmDialog}
      <div className="d-flex justify-content-between align-items-center mb-4 gap-2 flex-wrap">
        <div>
          <h1 className="h4 mb-1">Documents & échéances</h1>
          <p className="text-muted mb-0">Documents attachés aux joueurs/staff, avec suivi des échéances (documents + licences).</p>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <ListSearchInput value={search} onChange={setSearch} placeholder="Rechercher un document..." />
          {canManage && (
            <button type="button" className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
              <i className="fas fa-plus me-2" aria-hidden="true" />
              {showForm ? "Annuler" : "Nouveau document"}
            </button>
          )}
        </div>
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

      {expiringItems.length > 0 && (
        <div className="card mb-4 border-warning">
          <div className="card-header bg-transparent">
            <h6 className="card-title mb-0">Échéances à venir (60 jours)</h6>
          </div>
          <div className="card-body">
            <ul className="list-group list-group-flush">
              {expiringItems.map((item) => (
                <li key={`${item.source}-${item.id}`} className="list-group-item d-flex justify-content-between align-items-center px-0">
                  <span>
                    {item.source === "LICENSE" ? "📄 " : "📎 "}
                    {item.label}
                  </span>
                  <span className={`badge ${item.isExpired ? "bg-danger-subtle text-danger" : "bg-warning-subtle text-warning"}`}>
                    {new Date(item.expiresAt).toLocaleDateString("fr-FR")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {showForm && (
        <div className="card border border-primary mb-4">
          <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
            <h5 className="card-title mb-0 text-primary">Nouveau document</h5>
            <button type="button" onClick={() => setShowForm(false)} className="btn-close" aria-label="Fermer" />
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="row g-3">
              <div className="col-md-3">
                <label className="form-label">Rattaché à</label>
                <select name="entityType" className="form-select" value={entityType} onChange={(e) => setEntityType(e.target.value as EntityType)}>
                  {DOCUMENT_ENTITY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {ENTITY_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">{entityType === "PLAYER" ? "Joueur" : entityType === "STAFF" ? "Membre du staff" : "Identifiant"}</label>
                {entityType === "PLAYER" ? (
                  <select name="entityId" className="form-select" required defaultValue="">
                    <option value="" disabled>
                      Choisir
                    </option>
                    {players.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                ) : entityType === "STAFF" ? (
                  <select name="entityId" className="form-select" required defaultValue="">
                    <option value="" disabled>
                      Choisir
                    </option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input type="text" name="entityId" className="form-control" required maxLength={191} placeholder="Identifiant" />
                )}
              </div>
              <div className="col-md-3">
                <label className="form-label">Catégorie</label>
                <select name="category" className="form-select" defaultValue="OTHER">
                  {DOCUMENT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {DOCUMENT_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Titre</label>
                <input type="text" name="title" className="form-control" required maxLength={200} />
              </div>
              <div className="col-md-8">
                <label className="form-label">Fichier (URL)</label>
                <input type="text" name="fileUrl" className="form-control" required maxLength={500} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Date de délivrance</label>
                <input type="date" name="issuedAt" className="form-control" />
              </div>
              <div className="col-md-3">
                <label className="form-label">Date d&apos;expiration</label>
                <input type="date" name="expiresAt" className="form-control" />
              </div>
              <div className="col-12">
                <label className="form-label">Notes</label>
                <input type="text" name="notes" className="form-control" maxLength={500} />
              </div>
              <div className="col-12">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" /> : null}
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          {initialDocuments.length === 0 ? (
            <p className="text-muted mb-0 text-center py-5">Aucun document</p>
          ) : totalCount === 0 ? (
            <p className="text-muted mb-0 text-center py-5">Aucun résultat pour votre recherche</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Titre</th>
                    <th>Rattaché à</th>
                    <th>Catégorie</th>
                    <th>Expiration</th>
                    {canManage && <th className="text-end">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {visibleDocuments.map((d) => {
                    const expiration = expirationBadge(d.expiresAt);
                    return (
                      <tr key={d.id}>
                        <td className="fw-medium">
                          <a href={d.fileUrl} target="_blank" rel="noreferrer">
                            {d.title}
                          </a>
                        </td>
                        <td>{d.entityLabel}</td>
                        <td>{DOCUMENT_CATEGORY_LABELS[d.category as keyof typeof DOCUMENT_CATEGORY_LABELS] ?? d.category}</td>
                        <td>
                          {d.expiresAt ? new Date(d.expiresAt).toLocaleDateString("fr-FR") : "—"}
                          {expiration && <span className={`badge ms-2 ${expiration.className}`}>{expiration.label}</span>}
                        </td>
                        {canManage && (
                          <td className="text-end">
                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(d)} disabled={isPending}>
                              <i className="fas fa-trash" aria-hidden="true" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
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
