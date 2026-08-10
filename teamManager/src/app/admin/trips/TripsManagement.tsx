"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/hooks/useConfirm";
import { useListFilter } from "@/hooks/useListFilter";
import { ListSearchInput } from "@/components/admin/ListSearchInput";
import { ListPagination } from "@/components/admin/ListPagination";
import { AGE_CATEGORY_LABELS, type AgeCategory } from "@/types/categories";
import { createTrip, updateTrip, deleteTrip, addTripParticipant, toggleTripParticipantConfirmed, removeTripParticipant } from "./actions";

type VehicleType = "BUS" | "MINIBUS" | "CAR" | "OTHER";
type ParticipantType = "PLAYER" | "PARENT" | "STAFF";
type TransportOffer = "NONE" | "NEEDS_TRANSPORT" | "CAN_DRIVE";

interface VehicleData {
  id?: number;
  vehicleType: VehicleType;
  label: string | null;
  driverName: string | null;
  seats: number;
}

interface ParticipantData {
  id: number;
  participantType: ParticipantType;
  label: string;
  transportOffer: TransportOffer;
  offeredSeats: number | null;
  confirmed: boolean;
}

interface TripData {
  id: number;
  category: AgeCategory;
  matchLabel: string;
  departureTime: string;
  meetingPoint: string | null;
  notes: string | null;
  vehicles: VehicleData[];
  participants: ParticipantData[];
}

interface MatchOption {
  value: string;
  label: string;
}

interface PlayerOption {
  id: string;
  label: string;
}

const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = { BUS: "Bus", MINIBUS: "Minibus", CAR: "Voiture", OTHER: "Autre" };
const TRANSPORT_LABELS: Record<TransportOffer, string> = { NONE: "—", NEEDS_TRANSPORT: "🙋 Besoin d'un transport", CAN_DRIVE: "🚗 Peut transporter" };
const PARTICIPANT_TYPE_LABELS: Record<ParticipantType, string> = { PLAYER: "Joueur", PARENT: "Parent accompagnateur", STAFF: "Staff" };

function emptyVehicle(): VehicleData {
  return { vehicleType: "MINIBUS", label: "", driverName: "", seats: 8 };
}

export function TripsManagement({
  initialTrips,
  awayMatches,
  players,
  allowedCategories,
  canManage,
}: {
  initialTrips: TripData[];
  awayMatches: MatchOption[];
  players: PlayerOption[];
  allowedCategories: readonly AgeCategory[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { confirm, confirmDialog } = useConfirm();

  const [showForm, setShowForm] = useState(false);
  const [editingTrip, setEditingTrip] = useState<TripData | null>(null);
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [participantType, setParticipantType] = useState<ParticipantType>("PLAYER");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { search, setSearch, page, setPage, totalPages, totalCount, items: visibleTrips } = useListFilter(initialTrips, {
    searchableText: (t) => `${t.matchLabel} ${AGE_CATEGORY_LABELS[t.category]} ${t.meetingPoint ?? ""}`,
  });

  const openCreateForm = () => {
    setEditingTrip(null);
    setVehicles([]);
    setShowForm(true);
  };

  const openEditForm = (trip: TripData) => {
    setEditingTrip(trip);
    setVehicles(trip.vehicles.map((v) => ({ ...v })));
    setShowForm(true);
  };

  const formatDateTimeForInput = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const addVehicle = () => setVehicles((prev) => [...prev, emptyVehicle()]);
  const removeVehicle = (index: number) => setVehicles((prev) => prev.filter((_, i) => i !== index));
  const updateVehicle = (index: number, patch: Partial<VehicleData>) => setVehicles((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)));

  const totalSeats = vehicles.reduce((sum, v) => sum + (v.seats || 0), 0);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      formData.set("vehiclesJson", JSON.stringify(vehicles.filter((v) => v.seats > 0 || v.driverName || v.label)));
      const result = editingTrip ? await updateTrip(editingTrip.id, formData) : await createTrip(formData);
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

  const handleDelete = async (trip: TripData) => {
    if (!(await confirm(`Supprimer le déplacement "${trip.matchLabel}" ?`))) return;
    const result = await deleteTrip(trip.id);
    if (result.success) {
      startTransition(() => router.refresh());
    } else {
      setError(result.error || "Erreur lors de la suppression");
    }
  };

  const handleAddParticipant = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await addTripParticipant(formData);
    if (result.success) {
      (e.target as HTMLFormElement).reset();
      startTransition(() => router.refresh());
    } else {
      setError(result.error || "Erreur lors de l'ajout");
    }
  };

  const handleToggleConfirmed = async (id: number) => {
    const result = await toggleTripParticipantConfirmed(id);
    if (result.success) startTransition(() => router.refresh());
  };

  const handleRemoveParticipant = async (id: number) => {
    const result = await removeTripParticipant(id);
    if (result.success) {
      startTransition(() => router.refresh());
    } else {
      setError(result.error || "Erreur");
    }
  };

  const defaultCategory = useMemo(() => editingTrip?.category ?? allowedCategories[0] ?? "seniors", [editingTrip, allowedCategories]);

  return (
    <div className="container-fluid px-0">
      {confirmDialog}
      <div className="d-flex justify-content-between align-items-center mb-4 gap-2 flex-wrap">
        <div>
          <h1 className="h4 mb-1">Déplacements</h1>
          <p className="text-muted mb-0">Organisez les déplacements pour les matchs à l&apos;extérieur : transport, chauffeurs, joueurs et parents accompagnateurs.</p>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <ListSearchInput value={search} onChange={setSearch} placeholder="Rechercher un déplacement..." />
          {canManage && (
            <button type="button" className="btn btn-primary" onClick={openCreateForm}>
              <i className="fas fa-plus me-2" aria-hidden="true" />
              Nouveau déplacement
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
            <h5 className="card-title mb-0 text-primary">{editingTrip ? "Modifier le déplacement" : "Nouveau déplacement"}</h5>
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
              <div className="col-md-5">
                <label htmlFor="matchRef" className="form-label">
                  Match à l&apos;extérieur (optionnel)
                </label>
                <select id="matchRef" name="matchRef" className="form-select" defaultValue="">
                  <option value="">Aucun match lié</option>
                  {awayMatches.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label htmlFor="departureTime" className="form-label">
                  Heure de départ
                </label>
                <input type="datetime-local" id="departureTime" name="departureTime" className="form-control" required defaultValue={editingTrip ? formatDateTimeForInput(editingTrip.departureTime) : ""} />
              </div>

              <div className="col-md-6">
                <label htmlFor="meetingPoint" className="form-label">
                  Point de rendez-vous
                </label>
                <input type="text" id="meetingPoint" name="meetingPoint" className="form-control" maxLength={255} defaultValue={editingTrip?.meetingPoint ?? ""} placeholder="Ex: Parking du stade" />
              </div>
              <div className="col-md-6">
                <label htmlFor="notes" className="form-label">
                  Notes (optionnel)
                </label>
                <input type="text" id="notes" name="notes" className="form-control" defaultValue={editingTrip?.notes ?? ""} />
              </div>

              <div className="col-12">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <label className="form-label mb-0">
                    Véhicules {totalSeats > 0 && <span className="text-muted small">({totalSeats} places au total)</span>}
                  </label>
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={addVehicle}>
                    <i className="fas fa-plus me-1" aria-hidden="true" />
                    Ajouter un véhicule
                  </button>
                </div>
                {vehicles.length === 0 ? (
                  <p className="text-muted small">Aucun véhicule renseigné.</p>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {vehicles.map((v, i) => (
                      <div key={i} className="row g-2 align-items-center border rounded p-2 mx-0">
                        <div className="col-md-2">
                          <select className="form-select form-select-sm" value={v.vehicleType} onChange={(e) => updateVehicle(i, { vehicleType: e.target.value as VehicleType })}>
                            {(Object.keys(VEHICLE_TYPE_LABELS) as VehicleType[]).map((vt) => (
                              <option key={vt} value={vt}>
                                {VEHICLE_TYPE_LABELS[vt]}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-3">
                          <input type="text" className="form-control form-control-sm" placeholder="Ex: Bus 1" value={v.label ?? ""} onChange={(e) => updateVehicle(i, { label: e.target.value })} />
                        </div>
                        <div className="col-md-3">
                          <input type="text" className="form-control form-control-sm" placeholder="Chauffeur" value={v.driverName ?? ""} onChange={(e) => updateVehicle(i, { driverName: e.target.value })} />
                        </div>
                        <div className="col-md-3">
                          <div className="input-group input-group-sm">
                            <input type="number" className="form-control" min={0} value={v.seats} onChange={(e) => updateVehicle(i, { seats: parseInt(e.target.value, 10) || 0 })} />
                            <span className="input-group-text">places</span>
                          </div>
                        </div>
                        <div className="col-md-1">
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeVehicle(i)}>
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
                  {saving ? <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" /> : null}
                  {editingTrip ? "Enregistrer" : "Créer le déplacement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {initialTrips.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <p className="text-muted mb-0 text-center py-5">Aucun déplacement planifié</p>
          </div>
        </div>
      ) : totalCount === 0 ? (
        <div className="card">
          <div className="card-body">
            <p className="text-muted mb-0 text-center py-5">Aucun résultat pour votre recherche</p>
          </div>
        </div>
      ) : (
        visibleTrips.map((t) => {
          const seats = t.vehicles.reduce((sum, v) => sum + v.seats, 0);
          const offered = t.participants.filter((p) => p.transportOffer === "CAN_DRIVE").reduce((sum, p) => sum + (p.offeredSeats ?? 0), 0);
          const needs = t.participants.filter((p) => p.transportOffer === "NEEDS_TRANSPORT").length;
          const registeredPlayerIds = new Set(t.participants.map((p) => p.label));
          return (
            <div className="card mb-3" key={t.id}>
              <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                  <h5 className="card-title mb-1">
                    🚌 {AGE_CATEGORY_LABELS[t.category]} — {t.matchLabel}
                  </h5>
                  <div className="d-flex flex-wrap gap-3 align-items-center text-muted small">
                    <span>
                      Départ : {new Date(t.departureTime).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {t.meetingPoint && <span>📍 {t.meetingPoint}</span>}
                    <span>
                      🚐 {t.vehicles.length} véhicule(s) — {seats} place(s){offered > 0 ? ` + ${offered} en covoiturage` : ""}
                    </span>
                    <span>👥 {t.participants.length} participant(s){needs > 0 ? ` · ${needs} besoin(s) de transport` : ""}</span>
                  </div>
                </div>
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setExpandedId((prev) => (prev === t.id ? null : t.id))}>
                    <i className={`fas fa-chevron-${expandedId === t.id ? "up" : "down"}`} aria-hidden="true" />
                  </button>
                  {canManage && (
                    <>
                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openEditForm(t)}>
                        <i className="fas fa-edit" aria-hidden="true" />
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(t)} disabled={isPending}>
                        <i className="fas fa-trash" aria-hidden="true" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              {expandedId === t.id && (
                <div className="card-body">
                  {t.participants.length > 0 && (
                    <div className="table-responsive mb-3">
                      <table className="table table-sm table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Nom</th>
                            <th>Type</th>
                            <th>Transport</th>
                            <th>Présent</th>
                            {canManage && <th className="text-end">Actions</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {t.participants.map((p) => (
                            <tr key={p.id}>
                              <td>{p.label}</td>
                              <td>{PARTICIPANT_TYPE_LABELS[p.participantType]}</td>
                              <td>
                                {TRANSPORT_LABELS[p.transportOffer]}
                                {p.transportOffer === "CAN_DRIVE" && p.offeredSeats ? ` (${p.offeredSeats})` : ""}
                              </td>
                              <td>
                                {canManage ? (
                                  <div className="form-check form-switch mb-0">
                                    <input className="form-check-input" type="checkbox" checked={p.confirmed} onChange={() => handleToggleConfirmed(p.id)} />
                                  </div>
                                ) : p.confirmed ? (
                                  "✅"
                                ) : (
                                  "—"
                                )}
                              </td>
                              {canManage && (
                                <td className="text-end">
                                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleRemoveParticipant(p.id)}>
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
                  {canManage && (
                    <form onSubmit={handleAddParticipant} className="row g-2 align-items-end">
                      <input type="hidden" name="tripId" value={t.id} />
                      <div className="col-md-2">
                        <label className="form-label small mb-1">Type</label>
                        <select name="participantType" className="form-select form-select-sm" value={participantType} onChange={(e) => setParticipantType(e.target.value as ParticipantType)}>
                          {(Object.keys(PARTICIPANT_TYPE_LABELS) as ParticipantType[]).map((pt) => (
                            <option key={pt} value={pt}>
                              {PARTICIPANT_TYPE_LABELS[pt]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-3">
                        {participantType === "PLAYER" ? (
                          <>
                            <label className="form-label small mb-1">Joueur</label>
                            <select name="playerId" className="form-select form-select-sm" required>
                              <option value="">Choisir</option>
                              {players
                                .filter((p) => !registeredPlayerIds.has(p.label))
                                .map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.label}
                                  </option>
                                ))}
                            </select>
                          </>
                        ) : (
                          <>
                            <label className="form-label small mb-1">Nom</label>
                            <input type="text" name="name" className="form-control form-control-sm" required maxLength={150} />
                          </>
                        )}
                      </div>
                      <div className="col-md-3">
                        <label className="form-label small mb-1">Transport</label>
                        <select name="transportOffer" className="form-select form-select-sm">
                          <option value="NONE">—</option>
                          <option value="NEEDS_TRANSPORT">🙋 A besoin d&apos;un transport</option>
                          <option value="CAN_DRIVE">🚗 Peut transporter des joueurs</option>
                        </select>
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small mb-1">Places offertes</label>
                        <input type="number" name="offeredSeats" min={0} max={8} className="form-control form-control-sm" placeholder="0" />
                      </div>
                      <div className="col-md-2">
                        <button type="submit" className="btn btn-sm btn-primary w-100">
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
      <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} totalCount={totalCount} />
    </div>
  );
}
