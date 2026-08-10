"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/hooks/useConfirm";
import { useListFilter } from "@/hooks/useListFilter";
import { ListSearchInput } from "@/components/admin/ListSearchInput";
import { ListPagination } from "@/components/admin/ListPagination";
import { AGE_CATEGORY_LABELS, type AgeCategory } from "@/types/categories";
import { createTraining, updateTraining, deleteTraining, inviteToTraining, updateTrainingInvitationResponse, removeTrainingInvitation } from "./actions";

type TrainingType = "TECHNIQUE" | "PHYSIQUE" | "TACTIQUE" | "PREPARATION_MATCH" | "RECUPERATION" | "AUTRE";
type TrainingStatus = "SCHEDULED" | "DONE" | "CANCELLED";
type TrainingIntensity = "LOW" | "MEDIUM" | "HIGH";
type BlockType = "WARMUP" | "TECHNIQUE" | "SMALL_SIDED_GAME" | "TACTICS" | "MATCH" | "PHYSICAL" | "RECOVERY" | "OTHER";
type InvitationResponse = "PENDING" | "PRESENT" | "ABSENT" | "LATE" | "INJURED";

interface BlockData {
  blockType: BlockType;
  label: string;
  durationMinutes: number;
  notes: string | null;
  tacticsBoardId: number | null;
  tacticsBoardTitle: string | null;
}

interface InvitationData {
  id: number;
  playerId: string;
  playerLabel: string;
  response: InvitationResponse;
}

interface TrainingData {
  id: number;
  category: AgeCategory;
  title: string;
  objective: string | null;
  trainingType: TrainingType;
  intensity: TrainingIntensity | null;
  date: string;
  durationMinutes: number | null;
  equipment: string | null;
  stadiumId: number | null;
  stadiumName: string | null;
  venueName: string | null;
  notes: string | null;
  status: TrainingStatus;
  blocks: BlockData[];
  invitations: InvitationData[];
}

interface PlayerOption {
  id: string;
  label: string;
  category: AgeCategory;
}

interface StadiumOption {
  id: number;
  nameFr: string;
}

interface TacticsBoardOption {
  id: number;
  title: string;
}

const TYPE_LABELS: Record<TrainingType, string> = {
  TECHNIQUE: "Technique",
  PHYSIQUE: "Physique",
  TACTIQUE: "Tactique",
  PREPARATION_MATCH: "Préparation match",
  RECUPERATION: "Récupération",
  AUTRE: "Autre",
};

const INTENSITY_LABELS: Record<TrainingIntensity, string> = { LOW: "Faible", MEDIUM: "Moyenne", HIGH: "Élevée" };

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  WARMUP: "Échauffement",
  TECHNIQUE: "Technique",
  SMALL_SIDED_GAME: "Jeu réduit",
  TACTICS: "Tactique",
  MATCH: "Match",
  PHYSICAL: "Physique",
  RECOVERY: "Récupération",
  OTHER: "Autre",
};

const STATUS_LABELS: Record<TrainingStatus, string> = { SCHEDULED: "Planifié", DONE: "Effectué", CANCELLED: "Annulé" };
const STATUS_BADGES: Record<TrainingStatus, string> = {
  SCHEDULED: "bg-info-subtle text-info",
  DONE: "bg-success-subtle text-success",
  CANCELLED: "bg-secondary-subtle text-secondary",
};
const RESPONSE_LABELS: Record<InvitationResponse, string> = {
  PENDING: "En attente",
  PRESENT: "Présent",
  ABSENT: "Absent",
  LATE: "Retard",
  INJURED: "Blessé",
};
const RESPONSE_ICONS: Record<InvitationResponse, string> = { PENDING: "⏳", PRESENT: "✅", ABSENT: "❌", LATE: "⚠️", INJURED: "🩹" };
const RESPONSE_BADGES: Record<InvitationResponse, string> = {
  PENDING: "bg-warning-subtle text-warning",
  PRESENT: "bg-success-subtle text-success",
  ABSENT: "bg-danger-subtle text-danger",
  LATE: "bg-warning-subtle text-warning",
  INJURED: "bg-danger-subtle text-danger",
};

function emptyBlock(): BlockData {
  return { blockType: "OTHER", label: "", durationMinutes: 15, notes: null, tacticsBoardId: null, tacticsBoardTitle: null };
}

export function TrainingsManagement({
  initialTrainings,
  players,
  stadiums,
  tacticsBoards,
  allowedCategories,
  canCreate,
  canEdit,
  canDelete,
  canInvite,
}: {
  initialTrainings: TrainingData[];
  players: PlayerOption[];
  stadiums: StadiumOption[];
  tacticsBoards: TacticsBoardOption[];
  allowedCategories: readonly AgeCategory[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canInvite: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { confirm, confirmDialog } = useConfirm();

  const [showForm, setShowForm] = useState(false);
  const [editingTraining, setEditingTraining] = useState<TrainingData | null>(null);
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { search, setSearch, page, setPage, totalPages, totalCount, items: visibleTrainings } = useListFilter(initialTrainings, {
    searchableText: (t) => `${t.title} ${AGE_CATEGORY_LABELS[t.category]} ${TYPE_LABELS[t.trainingType]}`,
  });

  const openCreateForm = () => {
    setEditingTraining(null);
    setBlocks([]);
    setShowForm(true);
  };

  const openEditForm = (training: TrainingData) => {
    setEditingTraining(training);
    setBlocks(training.blocks.map((b) => ({ ...b })));
    setShowForm(true);
  };

  const formatDateTimeForInput = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const addBlock = () => setBlocks((prev) => [...prev, emptyBlock()]);
  const removeBlock = (index: number) => setBlocks((prev) => prev.filter((_, i) => i !== index));
  const updateBlock = (index: number, patch: Partial<BlockData>) =>
    setBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));

  const importFromTacticsBoard = (index: number, boardId: number) => {
    const board = tacticsBoards.find((b) => b.id === boardId);
    updateBlock(index, { tacticsBoardId: boardId || null, tacticsBoardTitle: board?.title ?? null, label: board ? board.title : blocks[index].label });
  };

  const blocksTotalMinutes = blocks.reduce((sum, b) => sum + (b.durationMinutes || 0), 0);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      formData.set("blocksJson", JSON.stringify(blocks.filter((b) => b.label.trim())));
      const result = editingTraining ? await updateTraining(editingTraining.id, formData) : await createTraining(formData);
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

  const handleDelete = async (training: TrainingData) => {
    if (!(await confirm(`Supprimer l'entraînement "${training.title}" ?`))) return;
    const result = await deleteTraining(training.id);
    if (result.success) {
      startTransition(() => router.refresh());
    } else {
      setError(result.error || "Erreur lors de la suppression");
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
    setSelectedPlayerIds([]);
  };

  const togglePlayer = (id: string) => {
    setSelectedPlayerIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const handleInviteSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selectedPlayerIds.length === 0) return;
    const formData = new FormData(e.currentTarget);
    selectedPlayerIds.forEach((id) => formData.append("playerIds", id));
    const result = await inviteToTraining(formData);
    if (result.success) {
      setSelectedPlayerIds([]);
      startTransition(() => router.refresh());
    } else {
      setError(result.error || "Erreur lors de l'invitation");
    }
  };

  const handleResponseChange = async (id: number, response: InvitationResponse) => {
    const result = await updateTrainingInvitationResponse(id, response);
    if (result.success) {
      startTransition(() => router.refresh());
    } else {
      setError(result.error || "Erreur");
    }
  };

  const handleRemoveInvitation = async (id: number) => {
    const result = await removeTrainingInvitation(id);
    if (result.success) {
      startTransition(() => router.refresh());
    } else {
      setError(result.error || "Erreur");
    }
  };

  const defaultCategory = useMemo(() => editingTraining?.category ?? allowedCategories[0] ?? "seniors", [editingTraining, allowedCategories]);

  return (
    <div className="container-fluid px-0">
      {confirmDialog}
      <div className="d-flex justify-content-between align-items-center mb-4 gap-2 flex-wrap">
        <div>
          <h1 className="h4 mb-1">Entraînements</h1>
          <p className="text-muted mb-0">Planifiez les séances (déroulé chronométré, présences) et invitez les joueurs de la catégorie concernée.</p>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <ListSearchInput value={search} onChange={setSearch} placeholder="Rechercher un entraînement..." />
          {canCreate && (
            <button type="button" className="btn btn-primary" onClick={openCreateForm}>
              <i className="fas fa-plus me-2" aria-hidden="true" />
              Nouvel entraînement
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
            <h5 className="card-title mb-0 text-primary">{editingTraining ? "Modifier l'entraînement" : "Nouvel entraînement"}</h5>
            <button type="button" onClick={() => setShowForm(false)} className="btn-close" aria-label="Fermer" />
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="row g-3">
              <div className="col-md-6">
                <label htmlFor="title" className="form-label">
                  Titre
                </label>
                <input type="text" id="title" name="title" className="form-control" required maxLength={200} defaultValue={editingTraining?.title ?? ""} placeholder="Ex: U14 — Mardi 18:00" />
              </div>
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
                <label htmlFor="trainingType" className="form-label">
                  Type
                </label>
                <select id="trainingType" name="trainingType" className="form-select" defaultValue={editingTraining?.trainingType ?? "AUTRE"}>
                  {(Object.keys(TYPE_LABELS) as TrainingType[]).map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-6">
                <label htmlFor="objective" className="form-label">
                  Objectif (optionnel)
                </label>
                <input type="text" id="objective" name="objective" className="form-control" maxLength={500} defaultValue={editingTraining?.objective ?? ""} placeholder="Ex: Améliorer la conservation du ballon" />
              </div>
              <div className="col-md-3">
                <label htmlFor="intensity" className="form-label">
                  Intensité
                </label>
                <select id="intensity" name="intensity" className="form-select" defaultValue={editingTraining?.intensity ?? ""}>
                  <option value="">Non précisée</option>
                  {(Object.keys(INTENSITY_LABELS) as TrainingIntensity[]).map((i) => (
                    <option key={i} value={i}>
                      {INTENSITY_LABELS[i]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label htmlFor="equipment" className="form-label">
                  Matériel
                </label>
                <input type="text" id="equipment" name="equipment" className="form-control" maxLength={500} defaultValue={editingTraining?.equipment ?? ""} placeholder="Plots, chasubles..." />
              </div>

              <div className="col-md-4">
                <label htmlFor="date" className="form-label">
                  Date & heure
                </label>
                <input type="datetime-local" id="date" name="date" className="form-control" required defaultValue={editingTraining ? formatDateTimeForInput(editingTraining.date) : ""} />
              </div>
              <div className="col-md-3">
                <label htmlFor="durationMinutes" className="form-label">
                  Durée totale (minutes)
                </label>
                <input type="number" id="durationMinutes" name="durationMinutes" className="form-control" min={1} defaultValue={editingTraining?.durationMinutes ?? 90} />
              </div>
              {editingTraining && (
                <div className="col-md-3">
                  <label htmlFor="status" className="form-label">
                    Statut
                  </label>
                  <select id="status" name="status" className="form-select" defaultValue={editingTraining.status}>
                    {(Object.keys(STATUS_LABELS) as TrainingStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="col-md-6">
                <label htmlFor="stadiumId" className="form-label">
                  Terrain (stade du club)
                </label>
                <select id="stadiumId" name="stadiumId" className="form-select" defaultValue={editingTraining?.stadiumId ?? ""}>
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
                <input type="text" id="venueName" name="venueName" className="form-control" maxLength={200} defaultValue={editingTraining?.venueName ?? ""} />
              </div>

              <div className="col-12">
                <label htmlFor="notes" className="form-label">
                  Notes du coach (optionnel)
                </label>
                <textarea id="notes" name="notes" className="form-control" rows={2} defaultValue={editingTraining?.notes ?? ""} />
              </div>

              <div className="col-12">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <label className="form-label mb-0">
                    Déroulé de la séance {blocksTotalMinutes > 0 && <span className="text-muted small">({blocksTotalMinutes} min au total)</span>}
                  </label>
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={addBlock}>
                    <i className="fas fa-plus me-1" aria-hidden="true" />
                    Ajouter un bloc
                  </button>
                </div>
                {blocks.length === 0 ? (
                  <p className="text-muted small">Aucun bloc — ex: Échauffement 15&apos;, Technique 20&apos;, Jeu réduit 25&apos;, Tactique 20&apos;, Match 20&apos;.</p>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {blocks.map((b, i) => (
                      <div key={i} className="row g-2 align-items-center border rounded p-2 mx-0">
                        <div className="col-md-2">
                          <select className="form-select form-select-sm" value={b.blockType} onChange={(e) => updateBlock(i, { blockType: e.target.value as BlockType })}>
                            {(Object.keys(BLOCK_TYPE_LABELS) as BlockType[]).map((bt) => (
                              <option key={bt} value={bt}>
                                {BLOCK_TYPE_LABELS[bt]}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-3">
                          <input type="text" className="form-control form-control-sm" placeholder="Libellé" value={b.label} onChange={(e) => updateBlock(i, { label: e.target.value })} />
                        </div>
                        <div className="col-md-2">
                          <div className="input-group input-group-sm">
                            <input type="number" className="form-control" min={1} value={b.durationMinutes} onChange={(e) => updateBlock(i, { durationMinutes: parseInt(e.target.value, 10) || 0 })} />
                            <span className="input-group-text">min</span>
                          </div>
                        </div>
                        <div className="col-md-3">
                          <select
                            className="form-select form-select-sm"
                            value={b.tacticsBoardId ?? ""}
                            onChange={(e) => importFromTacticsBoard(i, parseInt(e.target.value, 10))}
                          >
                            <option value="">Sans planche tactique</option>
                            {tacticsBoards.map((tb) => (
                              <option key={tb.id} value={tb.id}>
                                {tb.title}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-1">
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeBlock(i)}>
                            <i className="fas fa-times" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="col-12">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                      Enregistrement...
                    </>
                  ) : editingTraining ? (
                    "Enregistrer"
                  ) : (
                    "Créer l'entraînement"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {initialTrainings.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <p className="text-muted mb-0 text-center py-5">Aucun entraînement planifié</p>
          </div>
        </div>
      ) : totalCount === 0 ? (
        <div className="card">
          <div className="card-body">
            <p className="text-muted mb-0 text-center py-5">Aucun résultat pour votre recherche</p>
          </div>
        </div>
      ) : (
        visibleTrainings.map((t) => {
          const invitedIds = new Set(t.invitations.map((i) => i.playerId));
          const availablePlayers = players.filter((p) => p.category === t.category && !invitedIds.has(p.id));
          return (
            <div className="card mb-3" key={t.id}>
              <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                  <h5 className="card-title mb-1">{t.title}</h5>
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                    <span className="badge bg-primary-subtle text-primary">{AGE_CATEGORY_LABELS[t.category]}</span>
                    <span className="badge bg-info-subtle text-info">{TYPE_LABELS[t.trainingType]}</span>
                    {t.intensity && <span className="badge bg-secondary-subtle text-secondary">Intensité {INTENSITY_LABELS[t.intensity]}</span>}
                    <span className={`badge ${STATUS_BADGES[t.status]}`}>{STATUS_LABELS[t.status]}</span>
                    <span className="text-muted small">
                      {new Date(t.date).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      {t.durationMinutes ? ` · ${t.durationMinutes} min` : ""} · {t.stadiumName ?? t.venueName ?? "Lieu non défini"}
                    </span>
                  </div>
                  {t.objective && <div className="text-muted small mt-1">🎯 {t.objective}</div>}
                </div>
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => toggleExpand(t.id)}>
                    <i className={`fas fa-chevron-${expandedId === t.id ? "up" : "down"} me-1`} aria-hidden="true" />
                    Détails & présences ({t.invitations.length})
                  </button>
                  {canEdit && (
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openEditForm(t)}>
                      <i className="fas fa-edit" aria-hidden="true" />
                    </button>
                  )}
                  {canDelete && (
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(t)} disabled={isPending}>
                      <i className="fas fa-trash" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
              {expandedId === t.id && (
                <div className="card-body">
                  {t.equipment && (
                    <p className="text-muted small mb-2">
                      <i className="fas fa-toolbox me-1" aria-hidden="true" /> Matériel : {t.equipment}
                    </p>
                  )}
                  {t.blocks.length > 0 && (
                    <div className="table-responsive mb-3">
                      <table className="table table-sm mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Bloc</th>
                            <th>Durée</th>
                            <th>Planche tactique</th>
                          </tr>
                        </thead>
                        <tbody>
                          {t.blocks.map((b, i) => (
                            <tr key={i}>
                              <td>
                                <span className="badge bg-secondary-subtle text-secondary me-1">{BLOCK_TYPE_LABELS[b.blockType]}</span>
                                {b.label}
                              </td>
                              <td>{b.durationMinutes} min</td>
                              <td>{b.tacticsBoardTitle ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {t.invitations.length > 0 && (
                    <div className="table-responsive mb-3">
                      <table className="table table-sm table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Joueur</th>
                            <th>Présence</th>
                            {canInvite && <th className="text-end">Actions</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {t.invitations.map((i) => (
                            <tr key={i.id}>
                              <td>{i.playerLabel}</td>
                              <td>
                                {canInvite ? (
                                  <select
                                    className="form-select form-select-sm"
                                    style={{ width: "170px" }}
                                    value={i.response}
                                    onChange={(e) => handleResponseChange(i.id, e.target.value as InvitationResponse)}
                                  >
                                    {(Object.keys(RESPONSE_LABELS) as InvitationResponse[]).map((r) => (
                                      <option key={r} value={r}>
                                        {RESPONSE_ICONS[r]} {RESPONSE_LABELS[r]}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className={`badge ${RESPONSE_BADGES[i.response]}`}>
                                    {RESPONSE_ICONS[i.response]} {RESPONSE_LABELS[i.response]}
                                  </span>
                                )}
                              </td>
                              {canInvite && (
                                <td className="text-end">
                                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleRemoveInvitation(i.id)}>
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
                  {canInvite && (
                    <form onSubmit={handleInviteSubmit}>
                      <input type="hidden" name="trainingId" value={t.id} />
                      <label className="form-label">Inviter des joueurs ({AGE_CATEGORY_LABELS[t.category]})</label>
                      {availablePlayers.length === 0 ? (
                        <p className="text-muted small">Tous les joueurs de cette catégorie sont déjà invités.</p>
                      ) : (
                        <div className="border rounded p-2 mb-2" style={{ maxHeight: "200px", overflowY: "auto" }}>
                          {availablePlayers.map((p) => (
                            <div className="form-check" key={p.id}>
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id={`p-${t.id}-${p.id}`}
                                checked={selectedPlayerIds.includes(p.id)}
                                onChange={() => togglePlayer(p.id)}
                              />
                              <label className="form-check-label" htmlFor={`p-${t.id}-${p.id}`}>
                                {p.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                      <button type="submit" className="btn btn-sm btn-primary" disabled={selectedPlayerIds.length === 0}>
                        Inviter
                      </button>
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
