"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { saveLineup } from "./actions";

type Role = "NONE" | "STARTER" | "SUBSTITUTE";

interface PlayerOption {
  id: string;
  number: number;
  name: string;
  position: string | null;
}

interface LineupEntry {
  playerId: string;
  role: "STARTER" | "SUBSTITUTE";
  shirtNumber: number | null;
  position: string | null;
  isCaptain: boolean;
}

interface RowState {
  role: Role;
  shirtNumber: string;
  isCaptain: boolean;
}

export function LineupEditor({
  matchId,
  matchLabel,
  matchDate,
  players,
  initialLineup,
}: {
  matchId: string;
  matchLabel: string;
  matchDate: string | null;
  players: PlayerOption[];
  initialLineup: LineupEntry[];
}) {
  const lineupByPlayer = useMemo(() => new Map(initialLineup.map((l) => [l.playerId, l])), [initialLineup]);

  const [rows, setRows] = useState<Record<string, RowState>>(() => {
    const initial: Record<string, RowState> = {};
    for (const p of players) {
      const existing = lineupByPlayer.get(p.id);
      initial[p.id] = {
        role: existing?.role ?? "NONE",
        shirtNumber: existing?.shirtNumber != null ? String(existing.shirtNumber) : String(p.number),
        isCaptain: existing?.isCaptain ?? false,
      };
    }
    return initial;
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const starterCount = Object.values(rows).filter((r) => r.role === "STARTER").length;
  const substituteCount = Object.values(rows).filter((r) => r.role === "SUBSTITUTE").length;

  const setRole = (playerId: string, role: Role) => {
    setRows((prev) => ({ ...prev, [playerId]: { ...prev[playerId], role, isCaptain: role === "NONE" ? false : prev[playerId].isCaptain } }));
  };

  const setShirtNumber = (playerId: string, shirtNumber: string) => {
    setRows((prev) => ({ ...prev, [playerId]: { ...prev[playerId], shirtNumber } }));
  };

  const setCaptain = (playerId: string) => {
    setRows((prev) => {
      const next: Record<string, RowState> = {};
      for (const [id, row] of Object.entries(prev)) {
        next[id] = { ...row, isCaptain: id === playerId };
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const entries = players
        .filter((p) => rows[p.id].role !== "NONE")
        .map((p) => ({
          playerId: p.id,
          role: rows[p.id].role as "STARTER" | "SUBSTITUTE",
          shirtNumber: rows[p.id].shirtNumber ? parseInt(rows[p.id].shirtNumber, 10) : null,
          position: p.position,
          isCaptain: rows[p.id].isCaptain,
        }));

      const result = await saveLineup(matchId, JSON.stringify(entries));
      if (result.success) {
        setSuccess(result.message ?? null);
      } else {
        setError(result.error || "Erreur lors de l'enregistrement");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-fluid px-0">
      <div className="d-flex justify-content-between align-items-center mb-4 gap-2 flex-wrap">
        <div>
          <h1 className="h4 mb-1">Composition — {matchLabel}</h1>
          <p className="text-muted mb-0">
            {matchDate ? new Date(matchDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Date non définie"}
          </p>
        </div>
        <Link href="/admin/matches" className="btn btn-outline-secondary btn-sm">
          Retour aux matchs
        </Link>
      </div>

      <div className="d-flex gap-2 mb-3">
        <span className={`badge ${starterCount === 11 ? "bg-success-subtle text-success" : "bg-warning-subtle text-warning"}`}>
          {starterCount} / 11 titulaires
        </span>
        <span className="badge bg-info-subtle text-info">{substituteCount} remplaçant(s)</span>
      </div>

      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-start mb-3">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Fermer" className="btn-close" />
        </div>
      )}
      {success && (
        <div className="alert alert-success d-flex justify-content-between align-items-start mb-3">
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess(null)} aria-label="Fermer" className="btn-close" />
        </div>
      )}

      <div className="card">
        <div className="card-body">
          {players.length === 0 ? (
            <p className="text-muted mb-0">Aucun joueur actif dans l&apos;effectif</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: "90px" }}>N°</th>
                    <th>Joueur</th>
                    <th>Poste</th>
                    <th style={{ width: "280px" }}>Rôle</th>
                    <th style={{ width: "100px" }} className="text-center">
                      Capitaine
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p) => {
                    const row = rows[p.id];
                    return (
                      <tr key={p.id} className={row.role !== "NONE" ? "table-active" : undefined}>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            style={{ width: "70px" }}
                            value={row.shirtNumber}
                            disabled={row.role === "NONE"}
                            onChange={(e) => setShirtNumber(p.id, e.target.value)}
                            min={1}
                            max={99}
                          />
                        </td>
                        <td className="fw-medium">{p.name}</td>
                        <td>{p.position ?? "—"}</td>
                        <td>
                          <div className="btn-group btn-group-sm" role="group">
                            <button
                              type="button"
                              className={`btn ${row.role === "NONE" ? "btn-secondary" : "btn-outline-secondary"}`}
                              onClick={() => setRole(p.id, "NONE")}
                            >
                              Aucun
                            </button>
                            <button
                              type="button"
                              className={`btn ${row.role === "STARTER" ? "btn-success" : "btn-outline-success"}`}
                              onClick={() => setRole(p.id, "STARTER")}
                              disabled={row.role !== "STARTER" && starterCount >= 11}
                            >
                              Titulaire
                            </button>
                            <button
                              type="button"
                              className={`btn ${row.role === "SUBSTITUTE" ? "btn-info" : "btn-outline-info"}`}
                              onClick={() => setRole(p.id, "SUBSTITUTE")}
                            >
                              Remplaçant
                            </button>
                          </div>
                        </td>
                        <td className="text-center">
                          <input
                            type="radio"
                            name="captain"
                            className="form-check-input"
                            checked={row.isCaptain}
                            disabled={row.role === "NONE"}
                            onChange={() => setCaptain(p.id)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="card-footer bg-transparent">
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Enregistrement...
              </>
            ) : (
              "Enregistrer la composition"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
