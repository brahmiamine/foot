"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/hooks/useConfirm";
import { MATCH_EVENT_TYPES, MATCH_EVENT_LABELS } from "@/types/match-events";
import { createMatchEvent, deleteMatchEvent } from "@/lib/match-event-actions";
import type { MatchRef } from "@/services/MatchFormationService";

interface PlayerOption {
  id: string;
  name: string;
  number: number | null;
}

interface EventRow {
  id: number;
  eventType: string;
  teamSide: "HOME" | "AWAY";
  playerId: string | null;
  playerName: string | null;
  minute: number | null;
  notes: string | null;
}

interface Props {
  ref: MatchRef;
  matchLabel: string;
  players: PlayerOption[];
  initialEvents: EventRow[];
  canManage: boolean;
  backHref: string;
  backLabel: string;
}

export function MatchEventsManagement({ ref, matchLabel, players, initialEvents, canManage, backHref, backLabel }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { confirm, confirmDialog } = useConfirm();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      const result = await createMatchEvent(ref, formData);
      if (result.success) {
        (e.target as HTMLFormElement).reset();
        startTransition(() => router.refresh());
      } else {
        setError(result.error || "Erreur");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (event: EventRow) => {
    if (!(await confirm(`Supprimer cet événement (${MATCH_EVENT_LABELS[event.eventType as keyof typeof MATCH_EVENT_LABELS] ?? event.eventType}) ?`))) return;
    const result = await deleteMatchEvent(ref, event.id);
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
          <h1 className="h4 mb-1">Événements de match</h1>
          <p className="text-muted mb-0">{matchLabel}</p>
        </div>
        <a href={backHref} className="btn btn-outline-secondary">
          <i className="fas fa-arrow-left me-1" aria-hidden="true" />
          {backLabel}
        </a>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {canManage && (
        <div className="card mb-4">
          <div className="card-body">
            <h5 className="card-title">Ajouter un événement</h5>
            <form onSubmit={handleSubmit} className="row g-2 align-items-end">
              <div className="col-md-2">
                <label className="form-label">Type</label>
                <select name="eventType" className="form-select" required>
                  {MATCH_EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {MATCH_EVENT_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">Équipe</label>
                <select name="teamSide" className="form-select" required>
                  <option value="HOME">Domicile</option>
                  <option value="AWAY">Extérieur</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Joueur (optionnel)</label>
                <select name="playerId" className="form-select">
                  <option value="">—</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.number ? `#${p.number} ` : ""}
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">Minute</label>
                <input type="number" name="minute" min={0} max={150} className="form-control" />
              </div>
              <div className="col-md-2">
                <label className="form-label">Notes</label>
                <input type="text" name="notes" className="form-control" maxLength={255} />
              </div>
              <div className="col-md-1">
                <button type="submit" className="btn btn-primary w-100" disabled={saving}>
                  <i className="fas fa-plus" aria-hidden="true" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          <h5 className="card-title">Chronologie</h5>
          {initialEvents.length === 0 ? (
            <p className="text-muted mb-0">Aucun événement enregistré.</p>
          ) : (
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Minute</th>
                  <th>Événement</th>
                  <th>Équipe</th>
                  <th>Joueur</th>
                  <th>Notes</th>
                  {canManage && <th></th>}
                </tr>
              </thead>
              <tbody>
                {initialEvents.map((e) => (
                  <tr key={e.id}>
                    <td>{e.minute != null ? `${e.minute}'` : "—"}</td>
                    <td>{MATCH_EVENT_LABELS[e.eventType as keyof typeof MATCH_EVENT_LABELS] ?? e.eventType}</td>
                    <td>{e.teamSide === "HOME" ? "Domicile" : "Extérieur"}</td>
                    <td>{e.playerName ?? "—"}</td>
                    <td>{e.notes ?? "—"}</td>
                    {canManage && (
                      <td className="text-end">
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(e)}>
                          <i className="fas fa-trash" aria-hidden="true" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
