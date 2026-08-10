"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/hooks/useConfirm";
import { useListFilter } from "@/hooks/useListFilter";
import { ListSearchInput } from "@/components/admin/ListSearchInput";
import { ListPagination } from "@/components/admin/ListPagination";
import { createLicense, updateLicense, deleteLicense } from "./actions";

type HolderType = "PLAYER" | "STAFF";
type LicenseType = "PLAYER" | "COACH" | "EXECUTIVE" | "OTHER";
type LicenseStatus = "PENDING" | "ACTIVE" | "EXPIRED" | "SUSPENDED" | "REJECTED";

interface LicenseData {
  id: number;
  holderType: HolderType;
  holderLabel: string;
  seasonName: string | null;
  licenseNumber: string | null;
  licenseType: LicenseType;
  status: LicenseStatus;
  issuedAt: string | null;
  expiresAt: string | null;
  documentUrl: string | null;
  notes: string | null;
}

interface PersonOption {
  id: string | number;
  label: string;
}

interface SeasonOption {
  id: number;
  name: string;
}

const TYPE_LABELS: Record<LicenseType, string> = { PLAYER: "Joueur", COACH: "Entraîneur", EXECUTIVE: "Dirigeant", OTHER: "Autre" };
const STATUS_LABELS: Record<LicenseStatus, string> = { PENDING: "En attente", ACTIVE: "Active", EXPIRED: "Expirée", SUSPENDED: "Suspendue", REJECTED: "Refusée" };
const STATUS_BADGES: Record<LicenseStatus, string> = {
  PENDING: "bg-secondary-subtle text-secondary",
  ACTIVE: "bg-success-subtle text-success",
  EXPIRED: "bg-danger-subtle text-danger",
  SUSPENDED: "bg-warning-subtle text-warning",
  REJECTED: "bg-danger-subtle text-danger",
};

function expirationBadge(expiresAt: string | null): { label: string; className: string } | null {
  if (!expiresAt) return null;
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: "🔴 Expirée", className: "bg-danger-subtle text-danger" };
  if (days <= 7) return { label: `🔴 Expire dans ${days} j`, className: "bg-danger-subtle text-danger" };
  if (days <= 30) return { label: `🟠 Expire dans ${days} j`, className: "bg-warning-subtle text-warning" };
  return null;
}

export function LicensesManagement({
  initialLicenses,
  players,
  staff,
  seasons,
  canManage,
}: {
  initialLicenses: LicenseData[];
  players: PersonOption[];
  staff: PersonOption[];
  seasons: SeasonOption[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { confirm, confirmDialog } = useConfirm();

  const [showForm, setShowForm] = useState(false);
  const [editingLicense, setEditingLicense] = useState<LicenseData | null>(null);
  const [holderType, setHolderType] = useState<HolderType>("PLAYER");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { search, setSearch, page, setPage, totalPages, totalCount, items: visibleLicenses } = useListFilter(initialLicenses, {
    searchableText: (l) => `${l.holderLabel} ${l.licenseNumber ?? ""} ${STATUS_LABELS[l.status]}`,
  });

  const openCreateForm = () => {
    setEditingLicense(null);
    setHolderType("PLAYER");
    setShowForm(true);
  };

  const openEditForm = (license: LicenseData) => {
    setEditingLicense(license);
    setHolderType(license.holderType);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      const result = editingLicense ? await updateLicense(editingLicense.id, formData) : await createLicense(formData);
      if (result.success) {
        setSuccess(result.message ?? null);
        setShowForm(false);
        startTransition(() => router.refresh());
      } else {
        setError(result.error || "Erreur");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (license: LicenseData) => {
    if (!(await confirm(`Supprimer la licence de ${license.holderLabel} ?`))) return;
    const result = await deleteLicense(license.id);
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
          <h1 className="h4 mb-1">Licences</h1>
          <p className="text-muted mb-0">
            Licences FTF des joueurs et du staff, valables une saison. Suivi manuel — pas la source officielle FTF tant qu&apos;aucune synchronisation n&apos;existe.
          </p>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <ListSearchInput value={search} onChange={setSearch} placeholder="Rechercher..." />
          {canManage && (
            <button type="button" className="btn btn-primary" onClick={openCreateForm}>
              <i className="fas fa-plus me-2" aria-hidden="true" />
              Nouvelle licence
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

      {showForm && (
        <div className="card border border-primary mb-4">
          <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
            <h5 className="card-title mb-0 text-primary">{editingLicense ? "Modifier la licence" : "Nouvelle licence"}</h5>
            <button type="button" onClick={() => setShowForm(false)} className="btn-close" aria-label="Fermer" />
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="row g-3">
              {!editingLicense && (
                <>
                  <div className="col-md-3">
                    <label className="form-label">Titulaire</label>
                    <select name="holderType" className="form-select" value={holderType} onChange={(e) => setHolderType(e.target.value as HolderType)}>
                      <option value="PLAYER">Joueur</option>
                      <option value="STAFF">Staff</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">{holderType === "PLAYER" ? "Joueur" : "Membre du staff"}</label>
                    {holderType === "PLAYER" ? (
                      <select name="playerId" className="form-select" required defaultValue="">
                        <option value="" disabled>
                          Choisir
                        </option>
                        {players.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select name="staffId" className="form-select" required defaultValue="">
                        <option value="" disabled>
                          Choisir
                        </option>
                        {staff.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </>
              )}
              <div className="col-md-3">
                <label htmlFor="seasonId" className="form-label">
                  Saison
                </label>
                <select id="seasonId" name="seasonId" className="form-select" defaultValue="">
                  <option value="">Non liée</option>
                  {seasons.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label htmlFor="licenseNumber" className="form-label">
                  Numéro de licence
                </label>
                <input type="text" id="licenseNumber" name="licenseNumber" className="form-control" maxLength={50} defaultValue={editingLicense?.licenseNumber ?? ""} />
              </div>
              <div className="col-md-3">
                <label htmlFor="licenseType" className="form-label">
                  Type
                </label>
                <select id="licenseType" name="licenseType" className="form-select" defaultValue={editingLicense?.licenseType ?? "PLAYER"}>
                  {(Object.keys(TYPE_LABELS) as LicenseType[]).map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label htmlFor="status" className="form-label">
                  Statut
                </label>
                <select id="status" name="status" className="form-select" defaultValue={editingLicense?.status ?? "PENDING"}>
                  {(Object.keys(STATUS_LABELS) as LicenseStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label htmlFor="issuedAt" className="form-label">
                  Date de délivrance
                </label>
                <input type="date" id="issuedAt" name="issuedAt" className="form-control" defaultValue={editingLicense?.issuedAt ?? ""} />
              </div>
              <div className="col-md-3">
                <label htmlFor="expiresAt" className="form-label">
                  Date d&apos;expiration
                </label>
                <input type="date" id="expiresAt" name="expiresAt" className="form-control" defaultValue={editingLicense?.expiresAt ?? ""} />
              </div>
              <div className="col-md-6">
                <label htmlFor="documentUrl" className="form-label">
                  Document (URL)
                </label>
                <input type="text" id="documentUrl" name="documentUrl" className="form-control" maxLength={500} defaultValue={editingLicense?.documentUrl ?? ""} />
              </div>
              <div className="col-12">
                <label htmlFor="notes" className="form-label">
                  Notes
                </label>
                <input type="text" id="notes" name="notes" className="form-control" maxLength={500} defaultValue={editingLicense?.notes ?? ""} />
              </div>
              <div className="col-12">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" /> : null}
                  {editingLicense ? "Enregistrer" : "Créer la licence"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          {initialLicenses.length === 0 ? (
            <p className="text-muted mb-0 text-center py-5">Aucune licence</p>
          ) : totalCount === 0 ? (
            <p className="text-muted mb-0 text-center py-5">Aucun résultat pour votre recherche</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Titulaire</th>
                    <th>Type</th>
                    <th>N° licence</th>
                    <th>Saison</th>
                    <th>Statut</th>
                    <th>Expiration</th>
                    {canManage && <th className="text-end">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {visibleLicenses.map((l) => {
                    const expiration = expirationBadge(l.expiresAt);
                    return (
                      <tr key={l.id}>
                        <td className="fw-medium">{l.holderLabel}</td>
                        <td>{TYPE_LABELS[l.licenseType]}</td>
                        <td>{l.licenseNumber ?? "—"}</td>
                        <td>{l.seasonName ?? "—"}</td>
                        <td>
                          <span className={`badge ${STATUS_BADGES[l.status]}`}>{STATUS_LABELS[l.status]}</span>
                        </td>
                        <td>
                          {l.expiresAt ? new Date(l.expiresAt).toLocaleDateString("fr-FR") : "—"}
                          {expiration && <span className={`badge ms-2 ${expiration.className}`}>{expiration.label}</span>}
                        </td>
                        {canManage && (
                          <td className="text-end">
                            <div className="btn-group" role="group">
                              <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openEditForm(l)}>
                                <i className="fas fa-edit" aria-hidden="true" />
                              </button>
                              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(l)} disabled={isPending}>
                                <i className="fas fa-trash" aria-hidden="true" />
                              </button>
                            </div>
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
