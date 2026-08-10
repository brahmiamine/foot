"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/hooks/useConfirm";
import { AGE_CATEGORIES, AGE_CATEGORY_LABELS } from "@/types/categories";
import { COMPETITION_TYPES, COMPETITION_FORMATS, COMPETITION_STATUSES } from "@/types/competitions";
import {
  createCompetition,
  updateCompetition,
  deleteCompetition,
  addCompetitionParticipant,
  removeCompetitionParticipant,
} from "./actions";

const TYPE_LABELS: Record<string, string> = {
  TOURNAMENT: "Tournoi",
  CUP: "Coupe",
  INTERNAL_LEAGUE: "Championnat interne",
  FRIENDLY_SERIES: "Série amicale",
  OTHER: "Autre",
};

const STATUS_LABELS: Record<string, string> = { PLANNED: "Planifiée", ACTIVE: "En cours", FINISHED: "Terminée" };
const STATUS_BADGES: Record<string, string> = { PLANNED: "bg-secondary", ACTIVE: "bg-success", FINISHED: "bg-dark" };

interface StandingRow {
  participantId: number;
  name: string;
  logoUrl: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

interface ParticipantData {
  id: number;
  name: string;
  isInternal: boolean;
}

interface CompetitionData {
  id: number;
  name: string;
  type: string;
  category: string | null;
  format: string;
  status: string;
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  seasonId: number | null;
  seasonName: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  participants: ParticipantData[];
  standings: StandingRow[];
}

interface Option {
  id: number;
  name: string;
}

interface ClubOption {
  id: string;
  nom: string;
}

interface Props {
  initialCompetitions: CompetitionData[];
  seasons: Option[];
  squads: Option[];
  clubs: ClubOption[];
  canManage: boolean;
}

export function CompetitionsManagement({ initialCompetitions, seasons, squads, clubs, canManage }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { confirm, confirmDialog } = useConfirm();

  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [participantMode, setParticipantMode] = useState<Record<number, "squad" | "club" | "name">>({});

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      const result = await createCompetition(formData);
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

  const handleStatusChange = async (competition: CompetitionData, status: string) => {
    const formData = new FormData();
    formData.set("name", competition.name);
    formData.set("type", competition.type);
    if (competition.category) formData.set("category", competition.category);
    formData.set("format", competition.format);
    formData.set("pointsWin", String(competition.pointsWin));
    formData.set("pointsDraw", String(competition.pointsDraw));
    formData.set("pointsLoss", String(competition.pointsLoss));
    formData.set("status", status);
    const result = await updateCompetition(competition.id, formData);
    if (result.success) {
      startTransition(() => router.refresh());
    } else {
      setError(result.error || "Erreur");
    }
  };

  const handleDelete = async (competition: CompetitionData) => {
    if (!(await confirm(`Supprimer la compétition "${competition.name}" ?`))) return;
    const result = await deleteCompetition(competition.id);
    if (result.success) {
      startTransition(() => router.refresh());
    } else {
      setError(result.error || "Erreur lors de la suppression");
    }
  };

  const handleAddParticipant = async (e: React.FormEvent<HTMLFormElement>, competitionId: number) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await addCompetitionParticipant(competitionId, formData);
    if (result.success) {
      (e.target as HTMLFormElement).reset();
      startTransition(() => router.refresh());
    } else {
      setError(result.error || "Erreur lors de l'ajout");
    }
  };

  const handleRemoveParticipant = async (competitionId: number, participantId: number) => {
    const result = await removeCompetitionParticipant(competitionId, participantId);
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
          <h1 className="h4 mb-1">Compétitions internes</h1>
          <p className="text-muted mb-0">Tournois, coupes amicales et séries organisés par le club — indépendants du calendrier fédéral officiel.</p>
        </div>
        {canManage && (
          <button type="button" className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
            <i className="fas fa-plus me-2" aria-hidden="true" />
            {showForm ? "Annuler" : "Nouvelle compétition"}
          </button>
        )}
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
            <h5 className="card-title mb-0 text-primary">Nouvelle compétition</h5>
            <button type="button" onClick={() => setShowForm(false)} className="btn-close" aria-label="Fermer" />
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="row g-3">
              <div className="col-md-4">
                <label className="form-label">Nom</label>
                <input type="text" name="name" className="form-control" required maxLength={150} />
              </div>
              <div className="col-md-2">
                <label className="form-label">Type</label>
                <select name="type" className="form-select" defaultValue="TOURNAMENT">
                  {COMPETITION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">Format</label>
                <select name="format" className="form-select" defaultValue="LEAGUE">
                  {COMPETITION_FORMATS.map((f) => (
                    <option key={f} value={f}>
                      {f === "LEAGUE" ? "Championnat" : f === "GROUPS" ? "Groupes" : "Élimination directe"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">Catégorie (optionnel)</label>
                <select name="category" className="form-select" defaultValue="">
                  <option value="">Toutes</option>
                  {AGE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {AGE_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">Saison</label>
                <select name="seasonId" className="form-select" defaultValue="">
                  <option value="">—</option>
                  {seasons.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">Points victoire</label>
                <input type="number" name="pointsWin" className="form-control" defaultValue={3} min={0} />
              </div>
              <div className="col-md-2">
                <label className="form-label">Points nul</label>
                <input type="number" name="pointsDraw" className="form-control" defaultValue={1} min={0} />
              </div>
              <div className="col-md-2">
                <label className="form-label">Points défaite</label>
                <input type="number" name="pointsLoss" className="form-control" defaultValue={0} min={0} />
              </div>
              <div className="col-md-3">
                <label className="form-label">Date de début</label>
                <input type="date" name="startDate" className="form-control" />
              </div>
              <div className="col-md-3">
                <label className="form-label">Date de fin</label>
                <input type="date" name="endDate" className="form-control" />
              </div>
              <div className="col-12">
                <label className="form-label">Notes</label>
                <textarea name="notes" className="form-control" rows={2} maxLength={500} />
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

      {initialCompetitions.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <p className="text-muted mb-0 text-center py-5">Aucune compétition créée</p>
          </div>
        </div>
      ) : (
        initialCompetitions.map((c) => {
          const availableSquads = squads.filter((s) => !c.participants.some((p) => p.isInternal && p.name === s.name));
          const mode = participantMode[c.id] ?? "squad";
          return (
            <div className="card mb-3" key={c.id}>
              <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                  <h6 className="card-title mb-1">
                    {c.name} <span className="badge bg-light text-dark ms-1">{TYPE_LABELS[c.type]}</span>
                  </h6>
                  <div className="text-muted small">
                    {c.category ? AGE_CATEGORY_LABELS[c.category as keyof typeof AGE_CATEGORY_LABELS] : "Toutes catégories"} · {c.seasonName ?? "Saison non précisée"}
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  {canManage ? (
                    <select
                      className={`form-select form-select-sm ${STATUS_BADGES[c.status]} text-white`}
                      style={{ width: "auto" }}
                      value={c.status}
                      onChange={(e) => handleStatusChange(c, e.target.value)}
                      disabled={isPending}
                    >
                      {COMPETITION_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={`badge ${STATUS_BADGES[c.status]}`}>{STATUS_LABELS[c.status]}</span>
                  )}
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setExpandedId((prev) => (prev === c.id ? null : c.id))}>
                    <i className={`fas fa-chevron-${expandedId === c.id ? "up" : "down"} me-1`} aria-hidden="true" />
                    Participants & classement
                  </button>
                  {canManage && (
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(c)} disabled={isPending}>
                      <i className="fas fa-trash" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
              {expandedId === c.id && (
                <div className="card-body">
                  <h6 className="mb-2">Classement</h6>
                  {c.standings.length === 0 ? (
                    <p className="text-muted small">Aucun participant.</p>
                  ) : (
                    <div className="table-responsive mb-4">
                      <table className="table table-sm mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>#</th>
                            <th>Participant</th>
                            <th>J</th>
                            <th>G</th>
                            <th>N</th>
                            <th>P</th>
                            <th>BP</th>
                            <th>BC</th>
                            <th>Diff</th>
                            <th>Pts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {c.standings.map((row, idx) => (
                            <tr key={row.participantId}>
                              <td>{idx + 1}</td>
                              <td>{row.name}</td>
                              <td>{row.played}</td>
                              <td>{row.won}</td>
                              <td>{row.drawn}</td>
                              <td>{row.lost}</td>
                              <td>{row.goalsFor}</td>
                              <td>{row.goalsAgainst}</td>
                              <td>{row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}</td>
                              <td>
                                <strong>{row.points}</strong>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <h6 className="mb-2">Participants</h6>
                  {c.participants.length > 0 && (
                    <ul className="list-group list-group-flush mb-3">
                      {c.participants.map((p) => (
                        <li key={p.id} className="list-group-item d-flex justify-content-between align-items-center px-0">
                          <span>
                            {p.name} {p.isInternal && <span className="badge bg-info text-dark ms-1">Équipe interne</span>}
                          </span>
                          {canManage && (
                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleRemoveParticipant(c.id, p.id)}>
                              <i className="fas fa-times" aria-hidden="true" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {canManage && (
                    <form onSubmit={(e) => handleAddParticipant(e, c.id)} className="row g-2 align-items-end">
                      <div className="col-md-3">
                        <label className="form-label small mb-1">Type</label>
                        <select
                          className="form-select form-select-sm"
                          value={mode}
                          onChange={(e) => setParticipantMode((prev) => ({ ...prev, [c.id]: e.target.value as "squad" | "club" | "name" }))}
                        >
                          <option value="squad">Équipe interne</option>
                          <option value="club">Club référencé</option>
                          <option value="name">Nom libre</option>
                        </select>
                      </div>
                      {mode === "squad" && (
                        <div className="col-md-4">
                          <label className="form-label small mb-1">Équipe interne</label>
                          <select name="internalTeamId" className="form-select form-select-sm" required defaultValue="">
                            <option value="" disabled>
                              Choisir
                            </option>
                            {availableSquads.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      {mode === "club" && (
                        <div className="col-md-4">
                          <label className="form-label small mb-1">Club</label>
                          <select name="externalTeamId" className="form-select form-select-sm" required defaultValue="">
                            <option value="" disabled>
                              Choisir
                            </option>
                            {clubs.map((club) => (
                              <option key={club.id} value={club.id}>
                                {club.nom}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      {mode === "name" && (
                        <div className="col-md-4">
                          <label className="form-label small mb-1">Nom</label>
                          <input type="text" name="externalName" className="form-control form-control-sm" required maxLength={200} />
                        </div>
                      )}
                      <div className="col-md-2">
                        <button type="submit" className="btn btn-sm btn-primary w-100">
                          <i className="fas fa-plus me-1" aria-hidden="true" />
                          Ajouter
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
    </div>
  );
}
