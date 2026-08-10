"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/hooks/useConfirm";
import { useListFilter } from "@/hooks/useListFilter";
import { ListSearchInput } from "@/components/admin/ListSearchInput";
import { ListPagination } from "@/components/admin/ListPagination";
import { createGuardian, deleteGuardian, linkGuardianToPlayer, unlinkGuardianFromPlayer } from "./actions";

interface LinkData {
  id: number;
  playerId: string;
  playerLabel: string;
  relationship: string | null;
  isPrimary: boolean;
  receivesNotifications: boolean;
  receivesDocuments: boolean;
}

interface GuardianData {
  id: number;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  links: LinkData[];
}

interface PlayerOption {
  id: string;
  label: string;
}

export function GuardiansManagement({ initialGuardians, players, canManage }: { initialGuardians: GuardianData[]; players: PlayerOption[]; canManage: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { confirm, confirmDialog } = useConfirm();

  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { search, setSearch, page, setPage, totalPages, totalCount, items: visibleGuardians } = useListFilter(initialGuardians, {
    searchableText: (g) => `${g.firstName} ${g.lastName} ${g.phone ?? ""} ${g.email ?? ""} ${g.links.map((l) => l.playerLabel).join(" ")}`,
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      const result = await createGuardian(formData);
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

  const handleDelete = async (guardian: GuardianData) => {
    if (!(await confirm(`Supprimer ${guardian.firstName} ${guardian.lastName} ?`))) return;
    const result = await deleteGuardian(guardian.id);
    if (result.success) {
      startTransition(() => router.refresh());
    } else {
      setError(result.error || "Erreur lors de la suppression");
    }
  };

  const handleLinkSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await linkGuardianToPlayer(formData);
    if (result.success) {
      (e.target as HTMLFormElement).reset();
      startTransition(() => router.refresh());
    } else {
      setError(result.error || "Erreur lors de la liaison");
    }
  };

  const handleUnlink = async (linkId: number) => {
    const result = await unlinkGuardianFromPlayer(linkId);
    if (result.success) {
      startTransition(() => router.refresh());
    } else {
      setError(result.error || "Erreur");
    }
  };

  return (
    <div className="container-fluid px-0">
      {confirmDialog}
      <div className="d-flex justify-content-between align-items-center mb-4 gap-2 flex-wrap">
        <div>
          <h1 className="h4 mb-1">Parents & tuteurs</h1>
          <p className="text-muted mb-0">Responsables légaux des joueurs, avec leurs préférences de contact (jamais rattachés aux comptes de connexion du club).</p>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <ListSearchInput value={search} onChange={setSearch} placeholder="Rechercher un parent, un joueur..." />
          {canManage && (
            <button type="button" className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
              <i className="fas fa-plus me-2" aria-hidden="true" />
              {showForm ? "Annuler" : "Nouveau parent/tuteur"}
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
            <h5 className="card-title mb-0 text-primary">Nouveau parent/tuteur</h5>
            <button type="button" onClick={() => setShowForm(false)} className="btn-close" aria-label="Fermer" />
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="row g-3">
              <div className="col-md-3">
                <label htmlFor="firstName" className="form-label">
                  Prénom
                </label>
                <input type="text" id="firstName" name="firstName" className="form-control" required maxLength={100} />
              </div>
              <div className="col-md-3">
                <label htmlFor="lastName" className="form-label">
                  Nom
                </label>
                <input type="text" id="lastName" name="lastName" className="form-control" required maxLength={100} />
              </div>
              <div className="col-md-3">
                <label htmlFor="phone" className="form-label">
                  Téléphone
                </label>
                <input type="tel" id="phone" name="phone" className="form-control" maxLength={30} />
              </div>
              <div className="col-md-3">
                <label htmlFor="email" className="form-label">
                  Email
                </label>
                <input type="email" id="email" name="email" className="form-control" maxLength={191} />
              </div>
              <div className="col-12">
                <label htmlFor="address" className="form-label">
                  Adresse (optionnel)
                </label>
                <input type="text" id="address" name="address" className="form-control" maxLength={255} />
              </div>
              <div className="col-12">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" /> : null}
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {initialGuardians.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <p className="text-muted mb-0 text-center py-5">Aucun parent/tuteur enregistré</p>
          </div>
        </div>
      ) : totalCount === 0 ? (
        <div className="card">
          <div className="card-body">
            <p className="text-muted mb-0 text-center py-5">Aucun résultat pour votre recherche</p>
          </div>
        </div>
      ) : (
        visibleGuardians.map((g) => {
          const linkedPlayerIds = new Set(g.links.map((l) => l.playerId));
          const availablePlayers = players.filter((p) => !linkedPlayerIds.has(p.id));
          return (
            <div className="card mb-3" key={g.id}>
              <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                  <h6 className="card-title mb-1">
                    {g.firstName} {g.lastName}
                  </h6>
                  <div className="text-muted small">
                    {g.phone ?? "—"} · {g.email ?? "—"}
                  </div>
                </div>
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setExpandedId((prev) => (prev === g.id ? null : g.id))}>
                    <i className={`fas fa-chevron-${expandedId === g.id ? "up" : "down"} me-1`} aria-hidden="true" />
                    Enfants ({g.links.length})
                  </button>
                  {canManage && (
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(g)} disabled={isPending}>
                      <i className="fas fa-trash" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
              {expandedId === g.id && (
                <div className="card-body">
                  {g.links.length > 0 && (
                    <div className="table-responsive mb-3">
                      <table className="table table-sm mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Joueur</th>
                            <th>Lien</th>
                            <th>Principal</th>
                            <th>Notifications</th>
                            <th>Documents</th>
                            {canManage && <th className="text-end">Actions</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {g.links.map((l) => (
                            <tr key={l.id}>
                              <td>{l.playerLabel}</td>
                              <td>{l.relationship ?? "—"}</td>
                              <td>{l.isPrimary ? "✅" : "—"}</td>
                              <td>{l.receivesNotifications ? "✅" : "—"}</td>
                              <td>{l.receivesDocuments ? "✅" : "—"}</td>
                              {canManage && (
                                <td className="text-end">
                                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleUnlink(l.id)}>
                                    <i className="fas fa-times" aria-hidden="true" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {canManage && availablePlayers.length > 0 && (
                    <form onSubmit={handleLinkSubmit} className="row g-2 align-items-end">
                      <input type="hidden" name="guardianId" value={g.id} />
                      <div className="col-md-3">
                        <label className="form-label small mb-1">Joueur</label>
                        <select name="playerId" className="form-select form-select-sm" required defaultValue="">
                          <option value="" disabled>
                            Choisir
                          </option>
                          {availablePlayers.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small mb-1">Lien</label>
                        <input type="text" name="relationship" className="form-control form-control-sm" placeholder="Père, mère..." maxLength={50} />
                      </div>
                      <div className="col-md-2">
                        <div className="form-check">
                          <input className="form-check-input" type="checkbox" name="isPrimary" id={`primary-${g.id}`} />
                          <label className="form-check-label small" htmlFor={`primary-${g.id}`}>
                            Contact principal
                          </label>
                        </div>
                      </div>
                      <div className="col-md-2">
                        <div className="form-check">
                          <input className="form-check-input" type="checkbox" name="receivesNotifications" id={`notif-${g.id}`} defaultChecked />
                          <label className="form-check-label small" htmlFor={`notif-${g.id}`}>
                            Notifications
                          </label>
                        </div>
                      </div>
                      <div className="col-md-2">
                        <div className="form-check">
                          <input className="form-check-input" type="checkbox" name="receivesDocuments" id={`docs-${g.id}`} defaultChecked />
                          <label className="form-check-label small" htmlFor={`docs-${g.id}`}>
                            Documents
                          </label>
                        </div>
                      </div>
                      <div className="col-md-1">
                        <button type="submit" className="btn btn-sm btn-primary w-100">
                          <i className="fas fa-plus" aria-hidden="true" />
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
      <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} totalCount={totalCount} />
    </div>
  );
}
