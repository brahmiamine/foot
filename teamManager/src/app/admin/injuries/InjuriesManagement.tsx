"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/hooks/useConfirm";
import { useListFilter } from "@/hooks/useListFilter";
import { ListSearchInput } from "@/components/admin/ListSearchInput";
import { ListPagination } from "@/components/admin/ListPagination";
import { createInjury, updateInjury, deleteInjury } from "./actions";

type Severity = "MINOR" | "MODERATE" | "SEVERE";
type Status = "ONGOING" | "RECOVERING" | "RESOLVED";
type Availability = "UNAVAILABLE" | "RECOVERY" | "PARTIAL" | "AVAILABLE";

interface InjuryDocument {
  name: string;
  url: string;
}

interface InjuryData {
  id: number;
  playerId: string;
  playerLabel: string;
  injuryDate: string;
  zone: string;
  severity: Severity;
  description: string | null;
  diagnosis: string | null;
  unavailabilityDays: number | null;
  expectedReturnDate: string | null;
  actualReturnDate: string | null;
  progressiveReturn: boolean;
  progressiveReturnNotes: string | null;
  documents: InjuryDocument[];
  status: Status;
  availabilityStatus: Availability;
  notes: string | null;
  createdAt: string;
}

interface PlayerOption {
  id: string;
  label: string;
}

const SEVERITY_LABELS: Record<Severity, string> = { MINOR: "Légère", MODERATE: "Modérée", SEVERE: "Grave" };
const SEVERITY_BADGES: Record<Severity, string> = {
  MINOR: "bg-info-subtle text-info",
  MODERATE: "bg-warning-subtle text-warning",
  SEVERE: "bg-danger-subtle text-danger",
};
const STATUS_LABELS: Record<Status, string> = { ONGOING: "En cours", RECOVERING: "En récupération", RESOLVED: "Rétabli" };
const STATUS_BADGES: Record<Status, string> = {
  ONGOING: "bg-danger-subtle text-danger",
  RECOVERING: "bg-warning-subtle text-warning",
  RESOLVED: "bg-success-subtle text-success",
};
const AVAILABILITY_LABELS: Record<Availability, string> = {
  UNAVAILABLE: "Indisponible",
  RECOVERY: "En soins",
  PARTIAL: "Reprise partielle",
  AVAILABLE: "Disponible",
};
const AVAILABILITY_BADGES: Record<Availability, string> = {
  UNAVAILABLE: "bg-danger-subtle text-danger",
  RECOVERY: "bg-warning-subtle text-warning",
  PARTIAL: "bg-info-subtle text-info",
  AVAILABLE: "bg-success-subtle text-success",
};

export function InjuriesManagement({ initialInjuries, players, canManage }: { initialInjuries: InjuryData[]; players: PlayerOption[]; canManage: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { confirm, confirmDialog } = useConfirm();

  const [showForm, setShowForm] = useState(false);
  const [editingInjury, setEditingInjury] = useState<InjuryData | null>(null);
  const [documents, setDocuments] = useState<InjuryDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { search, setSearch, page, setPage, totalPages, totalCount, items: visibleInjuries } = useListFilter(initialInjuries, {
    searchableText: (i) => `${i.playerLabel} ${i.zone} ${SEVERITY_LABELS[i.severity]} ${STATUS_LABELS[i.status]}`,
  });

  const openCreateForm = () => {
    setEditingInjury(null);
    setDocuments([]);
    setShowForm(true);
  };

  const openEditForm = (injury: InjuryData) => {
    setEditingInjury(injury);
    setDocuments(injury.documents);
    setShowForm(true);
  };

  const handleUploadDocument = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload/media", { method: "POST", body: formData });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de l'upload");
      }
      const data = await response.json();
      setDocuments((prev) => [...prev, { name: file.name, url: data.path }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'upload du document");
    } finally {
      setUploading(false);
    }
  };

  const removeDocument = (index: number) => setDocuments((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      formData.set("documentsJson", JSON.stringify(documents));
      const result = editingInjury ? await updateInjury(editingInjury.id, formData) : await createInjury(formData);
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

  const handleDelete = async (injury: InjuryData) => {
    if (!(await confirm(`Supprimer le dossier de blessure de ${injury.playerLabel} (${injury.zone}) ?`))) return;
    const result = await deleteInjury(injury.id);
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
          <h1 className="h4 mb-1">
            Blessures & santé <span className="badge bg-danger-subtle text-danger ms-2">Accès restreint</span>
          </h1>
          <p className="text-muted mb-0">Suivi médical des joueurs : zone, gravité, diagnostic, indisponibilité, reprise progressive, documents.</p>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <ListSearchInput value={search} onChange={setSearch} placeholder="Rechercher un joueur, une zone..." />
          {canManage && (
            <button type="button" className="btn btn-primary" onClick={openCreateForm}>
              <i className="fas fa-plus me-2" aria-hidden="true" />
              Nouveau dossier
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
        <div className="card border border-danger mb-4">
          <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
            <h5 className="card-title mb-0 text-danger">{editingInjury ? "Modifier le dossier" : "Nouveau dossier de blessure"}</h5>
            <button type="button" onClick={() => setShowForm(false)} className="btn-close" aria-label="Fermer" />
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="row g-3">
              <div className="col-md-4">
                <label htmlFor="playerId" className="form-label">
                  Joueur
                </label>
                <select id="playerId" name="playerId" className="form-select" required defaultValue={editingInjury?.playerId ?? ""} disabled={!!editingInjury}>
                  <option value="" disabled>
                    Choisir un joueur
                  </option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label htmlFor="injuryDate" className="form-label">
                  Date de la blessure
                </label>
                <input type="date" id="injuryDate" name="injuryDate" className="form-control" required defaultValue={editingInjury?.injuryDate ?? ""} />
              </div>
              <div className="col-md-4">
                <label htmlFor="zone" className="form-label">
                  Zone
                </label>
                <input type="text" id="zone" name="zone" className="form-control" required maxLength={100} defaultValue={editingInjury?.zone ?? ""} placeholder="Ex: Genou droit" />
              </div>

              <div className="col-md-4">
                <label htmlFor="severity" className="form-label">
                  Gravité
                </label>
                <select id="severity" name="severity" className="form-select" defaultValue={editingInjury?.severity ?? "MINOR"}>
                  {(Object.keys(SEVERITY_LABELS) as Severity[]).map((s) => (
                    <option key={s} value={s}>
                      {SEVERITY_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label htmlFor="status" className="form-label">
                  Statut
                </label>
                <select id="status" name="status" className="form-select" defaultValue={editingInjury?.status ?? "ONGOING"}>
                  {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label htmlFor="unavailabilityDays" className="form-label">
                  Indisponibilité (jours)
                </label>
                <input type="number" id="unavailabilityDays" name="unavailabilityDays" className="form-control" min={0} defaultValue={editingInjury?.unavailabilityDays ?? ""} />
              </div>
              <div className="col-md-4">
                <label htmlFor="availabilityStatus" className="form-label">
                  Disponibilité (moteur d&apos;éligibilité)
                </label>
                <select id="availabilityStatus" name="availabilityStatus" className="form-select" defaultValue={editingInjury?.availabilityStatus ?? "UNAVAILABLE"}>
                  {(Object.keys(AVAILABILITY_LABELS) as Availability[]).map((a) => (
                    <option key={a} value={a}>
                      {AVAILABILITY_LABELS[a]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-6">
                <label htmlFor="diagnosis" className="form-label">
                  Diagnostic
                </label>
                <input type="text" id="diagnosis" name="diagnosis" className="form-control" maxLength={500} defaultValue={editingInjury?.diagnosis ?? ""} />
              </div>
              <div className="col-md-6">
                <label htmlFor="description" className="form-label">
                  Description de la blessure
                </label>
                <input type="text" id="description" name="description" className="form-control" maxLength={500} defaultValue={editingInjury?.description ?? ""} />
              </div>

              <div className="col-md-4">
                <label htmlFor="expectedReturnDate" className="form-label">
                  Date de reprise prévue
                </label>
                <input type="date" id="expectedReturnDate" name="expectedReturnDate" className="form-control" defaultValue={editingInjury?.expectedReturnDate ?? ""} />
              </div>
              <div className="col-md-4">
                <label htmlFor="actualReturnDate" className="form-label">
                  Date de reprise réelle
                </label>
                <input type="date" id="actualReturnDate" name="actualReturnDate" className="form-control" defaultValue={editingInjury?.actualReturnDate ?? ""} />
              </div>
              <div className="col-md-4 d-flex align-items-end">
                <div className="form-check form-switch">
                  <input className="form-check-input" type="checkbox" id="progressiveReturn" name="progressiveReturn" defaultChecked={editingInjury?.progressiveReturn ?? false} />
                  <label className="form-check-label" htmlFor="progressiveReturn">
                    Retour progressif
                  </label>
                </div>
              </div>
              <div className="col-12">
                <label htmlFor="progressiveReturnNotes" className="form-label">
                  Détails du retour progressif (optionnel)
                </label>
                <input type="text" id="progressiveReturnNotes" name="progressiveReturnNotes" className="form-control" maxLength={500} defaultValue={editingInjury?.progressiveReturnNotes ?? ""} />
              </div>

              <div className="col-12">
                <label className="form-label">Documents médicaux</label>
                <input
                  type="file"
                  className="form-control"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadDocument(file);
                    e.target.value = "";
                  }}
                />
                {uploading && (
                  <div className="mt-1 small text-muted">
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                    Upload en cours...
                  </div>
                )}
                {documents.length > 0 && (
                  <ul className="list-unstyled mt-2 mb-0">
                    {documents.map((d, i) => (
                      <li key={i} className="d-flex align-items-center gap-2 small">
                        <i className="fas fa-file-medical text-danger" aria-hidden="true" />
                        <a href={d.url} target="_blank" rel="noreferrer">
                          {d.name}
                        </a>
                        <button type="button" className="btn btn-sm btn-link text-danger p-0" onClick={() => removeDocument(i)}>
                          Retirer
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="col-12">
                <label htmlFor="notes" className="form-label">
                  Notes (optionnel)
                </label>
                <textarea id="notes" name="notes" className="form-control" rows={2} defaultValue={editingInjury?.notes ?? ""} />
              </div>

              <div className="col-12">
                <button type="submit" className="btn btn-danger" disabled={saving || uploading}>
                  {saving ? <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" /> : null}
                  {editingInjury ? "Enregistrer" : "Créer le dossier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          {initialInjuries.length === 0 ? (
            <p className="text-muted mb-0 text-center py-5">Aucun dossier de blessure</p>
          ) : totalCount === 0 ? (
            <p className="text-muted mb-0 text-center py-5">Aucun résultat pour votre recherche</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Joueur</th>
                    <th>Zone</th>
                    <th>Gravité</th>
                    <th>Statut</th>
                    <th>Disponibilité</th>
                    <th>Reprise prévue</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleInjuries.map((i) => (
                    <Fragment key={i.id}>
                      <tr>
                        <td className="fw-medium">{i.playerLabel}</td>
                        <td>{i.zone}</td>
                        <td>
                          <span className={`badge ${SEVERITY_BADGES[i.severity]}`}>{SEVERITY_LABELS[i.severity]}</span>
                        </td>
                        <td>
                          <span className={`badge ${STATUS_BADGES[i.status]}`}>{STATUS_LABELS[i.status]}</span>
                        </td>
                        <td>
                          <span className={`badge ${AVAILABILITY_BADGES[i.availabilityStatus]}`}>{AVAILABILITY_LABELS[i.availabilityStatus]}</span>
                        </td>
                        <td>{i.expectedReturnDate ? new Date(i.expectedReturnDate).toLocaleDateString("fr-FR") : "—"}</td>
                        <td className="text-end">
                          <div className="btn-group" role="group">
                            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setExpandedId((prev) => (prev === i.id ? null : i.id))}>
                              <i className={`fas fa-chevron-${expandedId === i.id ? "up" : "down"}`} aria-hidden="true" />
                            </button>
                            {canManage && (
                              <>
                                <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openEditForm(i)}>
                                  <i className="fas fa-edit" aria-hidden="true" />
                                </button>
                                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(i)} disabled={isPending}>
                                  <i className="fas fa-trash" aria-hidden="true" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedId === i.id && (
                        <tr>
                          <td colSpan={7} className="bg-light-subtle">
                            <div className="p-2 small">
                              {i.description && <p className="mb-1">📋 {i.description}</p>}
                              {i.diagnosis && <p className="mb-1">🩺 Diagnostic : {i.diagnosis}</p>}
                              {i.unavailabilityDays !== null && <p className="mb-1">⏱️ Indisponibilité : {i.unavailabilityDays} jour(s)</p>}
                              {i.progressiveReturn && <p className="mb-1">🔄 Retour progressif{i.progressiveReturnNotes ? ` — ${i.progressiveReturnNotes}` : ""}</p>}
                              {i.actualReturnDate && <p className="mb-1">✅ Reprise réelle : {new Date(i.actualReturnDate).toLocaleDateString("fr-FR")}</p>}
                              {i.notes && <p className="mb-1">📝 {i.notes}</p>}
                              {i.documents.length > 0 && (
                                <div className="d-flex flex-wrap gap-2 mt-2">
                                  {i.documents.map((d, idx) => (
                                    <a key={idx} href={d.url} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-secondary">
                                      <i className="fas fa-file-medical me-1" aria-hidden="true" />
                                      {d.name}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
