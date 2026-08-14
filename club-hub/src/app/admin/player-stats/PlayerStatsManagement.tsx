"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/hooks/useConfirm";
import { useListFilter } from "@/hooks/useListFilter";
import { ListSearchInput } from "@/components/admin/ListSearchInput";
import { ListPagination } from "@/components/admin/ListPagination";
import { AGE_CATEGORY_LABELS, type AgeCategory } from "@/types/categories";
import { CSV_PLAYER_STAT_COLUMNS } from "@/types/player-stats";
import { createPlayerStats, importPlayerStatsCsv, deletePlayerStat } from "./actions";

interface TotalsRow {
  playerId: string;
  playerLabel: string;
  category: AgeCategory;
  minutesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  injuriesCount: number;
  trainingsAttended: number;
  trainingsTotal: number;
  entriesCount: number;
}

interface EntryRow {
  id: number;
  playerLabel: string;
  season: string | null;
  minutesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  injuriesCount: number;
  trainingsAttended: number;
  trainingsTotal: number;
  notes: string | null;
  createdAt: string;
}

interface PlayerOption {
  id: string;
  label: string;
}

const NUMERIC_FIELDS: { key: keyof Omit<TotalsRow, "playerId" | "playerLabel" | "category" | "entriesCount">; label: string }[] = [
  { key: "minutesPlayed", label: "Minutes" },
  { key: "goals", label: "Buts" },
  { key: "assists", label: "Passes" },
  { key: "yellowCards", label: "C. jaunes" },
  { key: "redCards", label: "C. rouges" },
  { key: "injuriesCount", label: "Blessures" },
];

export function PlayerStatsManagement({
  totals,
  entries,
  players,
  canManage,
  canImportCsv,
}: {
  totals: TotalsRow[];
  entries: EntryRow[];
  players: PlayerOption[];
  canManage: boolean;
  canImportCsv: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { confirm, confirmDialog } = useConfirm();

  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { search, setSearch, page, setPage, totalPages, totalCount, items: visibleTotals } = useListFilter(totals, {
    searchableText: (t) => `${t.playerLabel} ${AGE_CATEGORY_LABELS[t.category]}`,
  });

  const togglePlayer = (id: string) => {
    setSelectedPlayerIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (selectedPlayerIds.length === 0) {
      setError("Sélectionnez au moins un joueur");
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      selectedPlayerIds.forEach((id) => formData.append("playerIds", id));
      const result = await createPlayerStats(formData);
      if (result.success) {
        setSuccess(result.message ?? null);
        setShowForm(false);
        setSelectedPlayerIds([]);
        startTransition(() => router.refresh());
      } else {
        setError(result.error || "Erreur");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCsvFile = async (file: File) => {
    setError(null);
    setSuccess(null);
    setImporting(true);
    try {
      const text = await file.text();
      const result = await importPlayerStatsCsv(text);
      if (result.success) {
        setSuccess(result.message ?? null);
        setShowImport(false);
        startTransition(() => router.refresh());
      } else {
        setError(result.error || "Erreur lors de l'import");
      }
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteEntry = async (id: number) => {
    if (!(await confirm("Supprimer cette entrée de statistiques ?"))) return;
    const result = await deletePlayerStat(id);
    if (result.success) {
      startTransition(() => router.refresh());
    } else {
      setError(result.error || "Erreur lors de la suppression");
    }
  };

  const csvTemplate = `${CSV_PLAYER_STAT_COLUMNS.join(",")}\n10,2025-2026,900,5,3,1,0,0,12,14,`;
  const downloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modele-statistiques-joueurs.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container-fluid px-0">
      {confirmDialog}
      <div className="d-flex justify-content-between align-items-center mb-4 gap-2 flex-wrap">
        <div>
          <h1 className="h4 mb-1">Statistiques joueurs</h1>
          <p className="text-muted mb-0">Saisissez ou importez les statistiques (minutes, buts, passes, cartons, blessures, présence aux entraînements).</p>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <ListSearchInput value={search} onChange={setSearch} placeholder="Rechercher un joueur..." />
          {canImportCsv && (
            <button type="button" className="btn btn-outline-primary" onClick={() => setShowImport((v) => !v)}>
              <i className="fas fa-file-csv me-2" aria-hidden="true" />
              Importer CSV
            </button>
          )}
          {canManage && (
            <button type="button" className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
              <i className="fas fa-plus me-2" aria-hidden="true" />
              Saisir des stats
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

      {showImport && (
        <div className="card border border-primary mb-4">
          <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
            <h5 className="card-title mb-0 text-primary">Import CSV</h5>
            <button type="button" onClick={() => setShowImport(false)} className="btn-close" aria-label="Fermer" />
          </div>
          <div className="card-body">
            <p className="small text-muted">
              Colonnes attendues (en-tête obligatoire) : <code>{CSV_PLAYER_STAT_COLUMNS.join(", ")}</code>. La colonne <code>number</code> doit
              correspondre au numéro de maillot d&apos;un joueur de l&apos;effectif.
            </p>
            <div className="d-flex gap-2 align-items-center flex-wrap">
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={downloadTemplate}>
                <i className="fas fa-download me-1" aria-hidden="true" />
                Télécharger un modèle
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="form-control form-control-sm"
                style={{ maxWidth: "300px" }}
                disabled={importing}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCsvFile(file);
                }}
              />
              {importing && <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="card border border-primary mb-4">
          <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
            <h5 className="card-title mb-0 text-primary">Saisir des statistiques</h5>
            <button type="button" onClick={() => setShowForm(false)} className="btn-close" aria-label="Fermer" />
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="row g-3">
              <div className="col-12">
                <label className="form-label">Joueur(s) concerné(s)</label>
                <div className="border rounded p-2" style={{ maxHeight: "180px", overflowY: "auto" }}>
                  {players.map((p) => (
                    <div className="form-check" key={p.id}>
                      <input className="form-check-input" type="checkbox" id={`sp-${p.id}`} checked={selectedPlayerIds.includes(p.id)} onChange={() => togglePlayer(p.id)} />
                      <label className="form-check-label" htmlFor={`sp-${p.id}`}>
                        {p.label}
                      </label>
                    </div>
                  ))}
                </div>
                <div className="form-text">Les mêmes valeurs seront appliquées à tous les joueurs sélectionnés (utile pour la présence aux entraînements par exemple).</div>
              </div>
              <div className="col-md-2">
                <label htmlFor="season" className="form-label">
                  Saison
                </label>
                <input type="text" id="season" name="season" className="form-control" maxLength={20} placeholder="2025-2026" />
              </div>
              <div className="col-md-2">
                <label htmlFor="minutesPlayed" className="form-label">
                  Minutes
                </label>
                <input type="number" id="minutesPlayed" name="minutesPlayed" className="form-control" min={0} defaultValue={0} />
              </div>
              <div className="col-md-2">
                <label htmlFor="goals" className="form-label">
                  Buts
                </label>
                <input type="number" id="goals" name="goals" className="form-control" min={0} defaultValue={0} />
              </div>
              <div className="col-md-2">
                <label htmlFor="assists" className="form-label">
                  Passes
                </label>
                <input type="number" id="assists" name="assists" className="form-control" min={0} defaultValue={0} />
              </div>
              <div className="col-md-2">
                <label htmlFor="yellowCards" className="form-label">
                  C. jaunes
                </label>
                <input type="number" id="yellowCards" name="yellowCards" className="form-control" min={0} defaultValue={0} />
              </div>
              <div className="col-md-2">
                <label htmlFor="redCards" className="form-label">
                  C. rouges
                </label>
                <input type="number" id="redCards" name="redCards" className="form-control" min={0} defaultValue={0} />
              </div>
              <div className="col-md-2">
                <label htmlFor="injuriesCount" className="form-label">
                  Blessures
                </label>
                <input type="number" id="injuriesCount" name="injuriesCount" className="form-control" min={0} defaultValue={0} />
              </div>
              <div className="col-md-3">
                <label htmlFor="trainingsAttended" className="form-label">
                  Entraînements présents
                </label>
                <input type="number" id="trainingsAttended" name="trainingsAttended" className="form-control" min={0} defaultValue={0} />
              </div>
              <div className="col-md-3">
                <label htmlFor="trainingsTotal" className="form-label">
                  Entraînements total
                </label>
                <input type="number" id="trainingsTotal" name="trainingsTotal" className="form-control" min={0} defaultValue={0} />
              </div>
              <div className="col-12">
                <label htmlFor="notes" className="form-label">
                  Notes (optionnel)
                </label>
                <input type="text" id="notes" name="notes" className="form-control" maxLength={500} />
              </div>
              <div className="col-12">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" /> : null}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card mb-4">
        <div className="card-header">
          <h5 className="card-title mb-0">Totaux par joueur</h5>
        </div>
        <div className="card-body">
          {totals.length === 0 ? (
            <p className="text-muted mb-0 text-center py-4">Aucune statistique enregistrée</p>
          ) : totalCount === 0 ? (
            <p className="text-muted mb-0 text-center py-4">Aucun résultat pour votre recherche</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Joueur</th>
                    <th>Catégorie</th>
                    {NUMERIC_FIELDS.map((f) => (
                      <th key={f.key} className="text-center">
                        {f.label}
                      </th>
                    ))}
                    <th className="text-center">Présence entraînements</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTotals.map((t) => (
                    <tr key={t.playerId}>
                      <td className="fw-medium">{t.playerLabel}</td>
                      <td>
                        <span className="badge bg-primary-subtle text-primary">{AGE_CATEGORY_LABELS[t.category]}</span>
                      </td>
                      {NUMERIC_FIELDS.map((f) => (
                        <td key={f.key} className="text-center">
                          {t[f.key]}
                        </td>
                      ))}
                      <td className="text-center">{t.trainingsTotal > 0 ? `${t.trainingsAttended}/${t.trainingsTotal} (${Math.round((t.trainingsAttended / t.trainingsTotal) * 100)}%)` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} totalCount={totalCount} />
            </div>
          )}
        </div>
      </div>

      {canManage && entries.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h5 className="card-title mb-0">Historique des entrées</h5>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-sm table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Joueur</th>
                    <th>Saison</th>
                    <th>Min</th>
                    <th>Buts</th>
                    <th>Passes</th>
                    <th>Cartons</th>
                    <th>Blessures</th>
                    <th>Entraînements</th>
                    <th>Date</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id}>
                      <td>{e.playerLabel}</td>
                      <td>{e.season ?? "—"}</td>
                      <td>{e.minutesPlayed}</td>
                      <td>{e.goals}</td>
                      <td>{e.assists}</td>
                      <td>{e.yellowCards}J / {e.redCards}R</td>
                      <td>{e.injuriesCount}</td>
                      <td>{e.trainingsTotal > 0 ? `${e.trainingsAttended}/${e.trainingsTotal}` : "—"}</td>
                      <td className="text-muted small">{new Date(e.createdAt).toLocaleDateString("fr-FR")}</td>
                      <td className="text-end">
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteEntry(e.id)} disabled={isPending}>
                          <i className="fas fa-trash" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
