"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useConfirm } from "@/hooks/useConfirm";
import { useListFilter } from "@/hooks/useListFilter";
import { ListSearchInput } from "@/components/admin/ListSearchInput";
import { ListPagination } from "@/components/admin/ListPagination";
import { AGE_CATEGORY_LABELS, type AgeCategory } from "@/types/categories";
import { createFriendlyMatch, updateFriendlyMatch, setFriendlyMatchResult, deleteFriendlyMatch } from "./actions";

type FriendlyStatus = "UPCOMING" | "IN_PROGRESS" | "FINISHED" | "CANCELLED";

interface FriendlyMatchData {
  id: number;
  category: AgeCategory;
  opponentTeamId: string | null;
  opponentName: string;
  opponentLogoUrl: string | null;
  isHome: boolean;
  stadiumId: number | null;
  stadiumName: string | null;
  venueName: string | null;
  date: string;
  scoreHome: number | null;
  scoreAway: number | null;
  status: FriendlyStatus;
  notes: string | null;
}

interface TeamOption {
  id: string;
  nom: string;
  logoUrl: string | null;
}

interface StadiumOption {
  id: number;
  nameFr: string;
}

const STATUS_LABELS: Record<FriendlyStatus, string> = {
  UPCOMING: "À venir",
  IN_PROGRESS: "En cours",
  FINISHED: "Terminé",
  CANCELLED: "Annulé",
};

const STATUS_BADGES: Record<FriendlyStatus, string> = {
  UPCOMING: "bg-info-subtle text-info",
  IN_PROGRESS: "bg-warning-subtle text-warning",
  FINISHED: "bg-success-subtle text-success",
  CANCELLED: "bg-secondary-subtle text-secondary",
};

export function FriendlyMatchesManagement({
  initialMatches,
  opponentTeams,
  stadiums,
  allowedCategories,
  canCreate,
  canEdit,
  canDelete,
}: {
  initialMatches: FriendlyMatchData[];
  opponentTeams: TeamOption[];
  stadiums: StadiumOption[];
  allowedCategories: readonly AgeCategory[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { confirm, confirmDialog } = useConfirm();

  const [showForm, setShowForm] = useState(false);
  const [editingMatch, setEditingMatch] = useState<FriendlyMatchData | null>(null);
  const [opponentMode, setOpponentMode] = useState<"existing" | "new">("existing");
  const [saving, setSaving] = useState(false);
  const [resultEditingId, setResultEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { search, setSearch, page, setPage, totalPages, totalCount, items: visibleMatches } = useListFilter(initialMatches, {
    searchableText: (m) => `${m.opponentName} ${AGE_CATEGORY_LABELS[m.category]} ${m.stadiumName ?? ""} ${m.venueName ?? ""}`,
  });

  const openCreateForm = () => {
    setEditingMatch(null);
    setOpponentMode("existing");
    setShowForm(true);
  };

  const openEditForm = (match: FriendlyMatchData) => {
    setEditingMatch(match);
    setOpponentMode(match.opponentTeamId ? "existing" : "new");
    setShowForm(true);
  };

  const formatDateTimeForInput = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      const result = editingMatch ? await updateFriendlyMatch(editingMatch.id, formData) : await createFriendlyMatch(formData);
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

  const handleResultSubmit = async (e: React.FormEvent<HTMLFormElement>, id: number) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await setFriendlyMatchResult(id, formData);
    if (result.success) {
      setResultEditingId(null);
      startTransition(() => router.refresh());
    } else {
      setError(result.error || "Erreur lors de l'enregistrement du résultat");
    }
  };

  const handleDelete = async (match: FriendlyMatchData) => {
    if (!(await confirm(`Supprimer le match amical contre ${match.opponentName} ?`))) return;
    const result = await deleteFriendlyMatch(match.id);
    if (result.success) {
      startTransition(() => router.refresh());
    } else {
      setError(result.error || "Erreur lors de la suppression");
    }
  };

  const defaultCategory = useMemo(() => editingMatch?.category ?? allowedCategories[0] ?? "seniors", [editingMatch, allowedCategories]);

  return (
    <div className="container-fluid px-0">
      {confirmDialog}
      <div className="d-flex justify-content-between align-items-center mb-4 gap-2 flex-wrap">
        <div>
          <h1 className="h4 mb-1">Matchs amicaux</h1>
          <p className="text-muted mb-0">Organisez des matchs amicaux hors calendrier officiel, par catégorie.</p>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <ListSearchInput value={search} onChange={setSearch} placeholder="Rechercher un adversaire..." />
          {canCreate && (
            <button type="button" className="btn btn-primary" onClick={openCreateForm}>
              <i className="fas fa-plus me-2" aria-hidden="true" />
              Nouveau match amical
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
            <h5 className="card-title mb-0 text-primary">{editingMatch ? "Modifier le match amical" : "Nouveau match amical"}</h5>
            <button type="button" onClick={() => setShowForm(false)} className="btn-close" aria-label="Fermer" />
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="row g-3">
              <div className="col-md-3">
                <label htmlFor="category" className="form-label">
                  Catégorie
                </label>
                <select id="category" name="category" className="form-select" defaultValue={defaultCategory} disabled={allowedCategories.length <= 1}>
                  {allowedCategories.map((c) => (
                    <option key={c} value={c}>
                      {AGE_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-3">
                <label htmlFor="date" className="form-label">
                  Date & heure
                </label>
                <input
                  type="datetime-local"
                  id="date"
                  name="date"
                  className="form-control"
                  required
                  defaultValue={editingMatch ? formatDateTimeForInput(editingMatch.date) : ""}
                />
              </div>

              <div className="col-md-3 d-flex align-items-end">
                <div className="form-check form-switch">
                  <input className="form-check-input" type="checkbox" id="isHome" name="isHome" defaultChecked={editingMatch?.isHome ?? true} />
                  <label className="form-check-label" htmlFor="isHome">
                    Match à domicile
                  </label>
                </div>
              </div>

              <div className="col-12">
                <label className="form-label d-block">Adversaire</label>
                <div className="btn-group btn-group-sm mb-2" role="group">
                  <button type="button" className={`btn ${opponentMode === "existing" ? "btn-secondary" : "btn-outline-secondary"}`} onClick={() => setOpponentMode("existing")}>
                    Club du référentiel
                  </button>
                  <button type="button" className={`btn ${opponentMode === "new" ? "btn-secondary" : "btn-outline-secondary"}`} onClick={() => setOpponentMode("new")}>
                    Nouveau club
                  </button>
                </div>
                {opponentMode === "existing" ? (
                  <select name="opponentTeamId" className="form-select" defaultValue={editingMatch?.opponentTeamId ?? ""}>
                    <option value="">Choisir un club</option>
                    {opponentTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nom}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="row g-2">
                    <div className="col-md-6">
                      <input type="text" name="opponentNewName" className="form-control" placeholder="Nom du club adverse" defaultValue={!editingMatch?.opponentTeamId ? editingMatch?.opponentName : ""} />
                    </div>
                    <div className="col-md-6">
                      <input type="text" name="opponentLogoUrl" className="form-control" placeholder="URL du logo (optionnel)" defaultValue={editingMatch?.opponentLogoUrl ?? ""} />
                    </div>
                  </div>
                )}
              </div>

              <div className="col-md-6">
                <label htmlFor="stadiumId" className="form-label">
                  Terrain (stade du club)
                </label>
                <select id="stadiumId" name="stadiumId" className="form-select" defaultValue={editingMatch?.stadiumId ?? ""}>
                  <option value="">Aucun / voir lieu ci-dessous</option>
                  {stadiums.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nameFr}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label htmlFor="venueName" className="form-label">
                  Lieu (si terrain hors club)
                </label>
                <input type="text" id="venueName" name="venueName" className="form-control" maxLength={200} defaultValue={editingMatch?.venueName ?? ""} placeholder="Ex: Complexe sportif de..." />
              </div>

              <div className="col-12">
                <label htmlFor="notes" className="form-label">
                  Notes (optionnel)
                </label>
                <textarea id="notes" name="notes" className="form-control" rows={2} defaultValue={editingMatch?.notes ?? ""} />
              </div>

              <div className="col-12">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                      Enregistrement...
                    </>
                  ) : editingMatch ? (
                    "Enregistrer"
                  ) : (
                    "Créer le match"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          {initialMatches.length === 0 ? (
            <p className="text-muted mb-0 text-center py-5">Aucun match amical</p>
          ) : totalCount === 0 ? (
            <p className="text-muted mb-0 text-center py-5">Aucun résultat pour votre recherche</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Catégorie</th>
                    <th>Adversaire</th>
                    <th>Lieu</th>
                    <th>Score</th>
                    <th>Statut</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleMatches.map((m) => (
                    <tr key={m.id}>
                      <td>{new Date(m.date).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                      <td>
                        <span className="badge bg-primary-subtle text-primary">{AGE_CATEGORY_LABELS[m.category]}</span>
                      </td>
                      <td>
                        <strong>{m.isHome ? "vs" : "@"} {m.opponentName}</strong>
                      </td>
                      <td className="text-muted small">{m.stadiumName ?? m.venueName ?? "—"}</td>
                      <td>
                        {resultEditingId === m.id ? (
                          <form onSubmit={(e) => handleResultSubmit(e, m.id)} className="d-flex align-items-center gap-1">
                            <input type="number" name="scoreHome" min={0} defaultValue={m.scoreHome ?? ""} className="form-control form-control-sm" style={{ width: "56px" }} />
                            <span>-</span>
                            <input type="number" name="scoreAway" min={0} defaultValue={m.scoreAway ?? ""} className="form-control form-control-sm" style={{ width: "56px" }} />
                            <select name="status" defaultValue={m.status} className="form-select form-select-sm" style={{ width: "120px" }}>
                              {(Object.keys(STATUS_LABELS) as FriendlyStatus[]).map((s) => (
                                <option key={s} value={s}>
                                  {STATUS_LABELS[s]}
                                </option>
                              ))}
                            </select>
                            <button type="submit" className="btn btn-sm btn-success">
                              <i className="fas fa-check" aria-hidden="true" />
                            </button>
                            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setResultEditingId(null)}>
                              <i className="fas fa-times" aria-hidden="true" />
                            </button>
                          </form>
                        ) : m.scoreHome !== null && m.scoreAway !== null ? (
                          <span className="fw-medium">{m.isHome ? `${m.scoreHome} - ${m.scoreAway}` : `${m.scoreAway} - ${m.scoreHome}`}</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${STATUS_BADGES[m.status]}`}>{STATUS_LABELS[m.status]}</span>
                      </td>
                      <td className="text-end">
                        <div className="btn-group" role="group">
                          <Link href={`/admin/friendly-matches/${m.id}/lineup`} className="btn btn-sm btn-outline-success" title="Composition">
                            <i className="fas fa-users" aria-hidden="true" />
                          </Link>
                          <Link href={`/admin/match-events/friendly/${m.id}`} className="btn btn-sm btn-outline-warning" title="Événements">
                            <i className="fas fa-list-ol" aria-hidden="true" />
                          </Link>
                          {canEdit && (
                            <>
                              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setResultEditingId(m.id)} title="Résultat">
                                <i className="fas fa-futbol" aria-hidden="true" />
                              </button>
                              <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openEditForm(m)}>
                                <i className="fas fa-edit" aria-hidden="true" />
                              </button>
                            </>
                          )}
                          {canDelete && (
                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(m)} disabled={isPending}>
                              <i className="fas fa-trash" aria-hidden="true" />
                            </button>
                          )}
                        </div>
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
