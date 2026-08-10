"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FORMATIONS, FORMATION_CODES, DEFAULT_FORMATION, type FormationSlot } from "@/lib/formations";
import { saveMatchLineup, setMatchFormation, sendMatchConvocations } from "@/lib/lineup-actions";
import type { MatchRef } from "@/services/MatchFormationService";

type Role = "NONE" | "STARTER" | "SUBSTITUTE";

interface PlayerOption {
  id: string;
  number: number;
  name: string;
  position: string | null;
  eligible?: boolean;
  eligibilityReasons?: string[];
}

interface LineupEntry {
  playerId: string;
  role: "STARTER" | "SUBSTITUTE";
  shirtNumber: number | null;
  position: string | null;
  posX: number | null;
  posY: number | null;
  isCaptain: boolean;
}

interface RowState {
  role: Role;
  shirtNumber: string;
  isCaptain: boolean;
}

/**
 * Éditeur de composition + formation, partagé entre matchs officiels et
 * matchs amicaux. Le rôle (titulaire / remplaçant / aucun) se choisit dans
 * la liste de l'effectif ; les titulaires apparaissent ensuite comme des
 * jetons déplaçables librement (glisser-déposer) sur le terrain — la
 * formation choisie ne fait que proposer un placement de départ.
 */
export function PitchLineupEditor({
  ref,
  matchLabel,
  matchDate,
  players,
  initialLineup,
  initialFormation,
  isLocked,
  canEdit,
  canSendConvocations,
  backHref,
  backLabel,
}: {
  ref: MatchRef;
  matchLabel: string;
  matchDate: string | null;
  players: PlayerOption[];
  initialLineup: LineupEntry[];
  initialFormation: string;
  isLocked: boolean;
  canEdit: boolean;
  canSendConvocations: boolean;
  backHref: string;
  backLabel: string;
}) {
  const editable = canEdit && !isLocked;
  const lineupByPlayer = useMemo(() => new Map(initialLineup.map((l) => [l.playerId, l])), [initialLineup]);
  const playersById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

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

  const [starterOrder, setStarterOrder] = useState<string[]>(() => initialLineup.filter((l) => l.role === "STARTER").map((l) => l.playerId));

  const [positions, setPositions] = useState<Record<string, FormationSlot>>(() => {
    const initial: Record<string, FormationSlot> = {};
    for (const l of initialLineup) {
      if (l.role === "STARTER" && l.posX != null && l.posY != null) {
        initial[l.playerId] = { x: l.posX, y: l.posY };
      }
    }
    return initial;
  });

  const [formation, setFormation] = useState(FORMATIONS[initialFormation] ? initialFormation : DEFAULT_FORMATION);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const pitchRef = useRef<HTMLDivElement>(null);
  const draggingId = useRef<string | null>(null);

  const starterCount = Object.values(rows).filter((r) => r.role === "STARTER").length;
  const substituteCount = Object.values(rows).filter((r) => r.role === "SUBSTITUTE").length;

  const applyFormation = (code: string, order: string[]) => {
    const slots = FORMATIONS[code];
    if (!slots) return;
    setPositions((prev) => {
      const next = { ...prev };
      order.forEach((playerId, i) => {
        if (slots[i]) next[playerId] = slots[i];
      });
      return next;
    });
  };

  const setRole = (playerId: string, role: Role) => {
    setDirty(true);
    setRows((prev) => ({ ...prev, [playerId]: { ...prev[playerId], role, isCaptain: role === "NONE" ? false : prev[playerId].isCaptain } }));

    setStarterOrder((prevOrder) => {
      let nextOrder = prevOrder;
      if (role === "STARTER" && !prevOrder.includes(playerId)) {
        nextOrder = [...prevOrder, playerId];
      } else if (role !== "STARTER" && prevOrder.includes(playerId)) {
        nextOrder = prevOrder.filter((id) => id !== playerId);
        setPositions((prev) => {
          const next = { ...prev };
          delete next[playerId];
          return next;
        });
      }
      if (role === "STARTER" && !prevOrder.includes(playerId)) {
        const slots = FORMATIONS[formation];
        const slot = slots?.[nextOrder.length - 1];
        if (slot) {
          setPositions((prev) => ({ ...prev, [playerId]: slot }));
        }
      }
      return nextOrder;
    });
  };

  const setShirtNumber = (playerId: string, shirtNumber: string) => {
    setDirty(true);
    setRows((prev) => ({ ...prev, [playerId]: { ...prev[playerId], shirtNumber } }));
  };

  const setCaptain = (playerId: string) => {
    setDirty(true);
    setRows((prev) => {
      const next: Record<string, RowState> = {};
      for (const [id, row] of Object.entries(prev)) {
        next[id] = { ...row, isCaptain: id === playerId };
      }
      return next;
    });
  };

  const handleFormationChange = (code: string) => {
    setDirty(true);
    setFormation(code);
    applyFormation(code, starterOrder);
  };

  const clampPercent = (value: number) => Math.max(3, Math.min(97, value));

  const handlePointerDown = (playerId: string) => (e: React.PointerEvent) => {
    if (!editable) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    draggingId.current = playerId;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId.current || !pitchRef.current) return;
    const rect = pitchRef.current.getBoundingClientRect();
    const x = clampPercent(((e.clientX - rect.left) / rect.width) * 100);
    const y = clampPercent(((e.clientY - rect.top) / rect.height) * 100);
    setPositions((prev) => ({ ...prev, [draggingId.current as string]: { x, y } }));
  };

  const handlePointerUp = () => {
    if (draggingId.current) {
      setDirty(true);
      draggingId.current = null;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const entries: LineupEntry[] = players
        .filter((p) => rows[p.id].role !== "NONE")
        .map((p) => ({
          playerId: p.id,
          role: rows[p.id].role as "STARTER" | "SUBSTITUTE",
          shirtNumber: rows[p.id].shirtNumber ? parseInt(rows[p.id].shirtNumber, 10) : null,
          position: p.position,
          posX: positions[p.id]?.x ?? null,
          posY: positions[p.id]?.y ?? null,
          isCaptain: rows[p.id].isCaptain,
        }));

      if (formation !== initialFormation) {
        await setMatchFormation(ref, formation);
      }

      const result = await saveMatchLineup(ref, JSON.stringify(entries));
      if (result.success) {
        setSuccess(result.message ?? null);
        setDirty(false);
      } else {
        setError(result.error || "Erreur lors de l'enregistrement");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSendConvocations = async () => {
    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await sendMatchConvocations(ref);
      if (result.success) {
        setSuccess(result.message ?? null);
      } else {
        setError(result.error || "Erreur lors de l'envoi des convocations");
      }
    } finally {
      setSending(false);
    }
  };

  const starters = starterOrder.map((id) => playersById.get(id)).filter((p): p is PlayerOption => !!p);
  const substitutes = players.filter((p) => rows[p.id]?.role === "SUBSTITUTE");

  return (
    <div className="container-fluid px-0">
      <div className="d-flex justify-content-between align-items-center mb-4 gap-2 flex-wrap">
        <div>
          <h1 className="h4 mb-1">Composition — {matchLabel}</h1>
          <p className="text-muted mb-0">
            {matchDate ? new Date(matchDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Date non définie"}
          </p>
        </div>
        <Link href={backHref} className="btn btn-outline-secondary btn-sm">
          {backLabel}
        </Link>
      </div>

      {isLocked && (
        <div className="alert alert-secondary d-flex align-items-center gap-2 mb-3">
          <i className="fas fa-lock" aria-hidden="true" />
          <span>Ce match est terminé (ou annulé) : la composition et la formation ne peuvent plus être modifiées.</span>
        </div>
      )}

      <div className="d-flex gap-2 mb-3 flex-wrap align-items-center">
        <span className={`badge ${starterCount === 11 ? "bg-success-subtle text-success" : "bg-warning-subtle text-warning"}`}>
          {starterCount} / 11 titulaires
        </span>
        <span className="badge bg-info-subtle text-info">{substituteCount} remplaçant(s)</span>
        <select
          className="form-select form-select-sm ms-auto"
          style={{ width: "160px" }}
          value={formation}
          onChange={(e) => handleFormationChange(e.target.value)}
          disabled={!editable}
        >
          {FORMATION_CODES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
        {canSendConvocations && (
          <button type="button" className="btn btn-outline-primary btn-sm" onClick={handleSendConvocations} disabled={sending || starterCount + substituteCount === 0}>
            {sending ? <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" /> : <i className="fas fa-paper-plane me-2" aria-hidden="true" />}
            Envoyer les convocations
          </button>
        )}
        {editable && (
          <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" /> : <i className="fas fa-save me-2" aria-hidden="true" />}
            {dirty ? "Enregistrer les modifications" : "Enregistrer"}
          </button>
        )}
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

      <div className="row g-3">
        <div className="col-lg-6">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Terrain — glissez les joueurs pour ajuster leur position</h5>
            </div>
            <div className="card-body">
              <div
                ref={pitchRef}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="position-relative w-100 rounded overflow-hidden"
                style={{ aspectRatio: "68 / 100", background: "#2e7d43", touchAction: "none", userSelect: "none" }}
              >
                {/* Lignes du terrain */}
                <div className="position-absolute" style={{ inset: "3%", border: "2px solid rgba(255,255,255,0.85)" }} />
                <div className="position-absolute" style={{ left: "3%", right: "3%", top: "50%", height: 0, borderTop: "2px solid rgba(255,255,255,0.85)" }} />
                <div
                  className="position-absolute rounded-circle"
                  style={{ left: "50%", top: "50%", width: "26%", aspectRatio: "1 / 1", transform: "translate(-50%,-50%)", border: "2px solid rgba(255,255,255,0.85)" }}
                />
                <div className="position-absolute" style={{ left: "26%", right: "26%", top: "3%", height: "16%", border: "2px solid rgba(255,255,255,0.85)", borderTop: "none" }} />
                <div className="position-absolute" style={{ left: "26%", right: "26%", bottom: "3%", height: "16%", border: "2px solid rgba(255,255,255,0.85)", borderBottom: "none" }} />

                {starters.map((p) => {
                  const pos = positions[p.id] ?? { x: 50, y: 50 };
                  const row = rows[p.id];
                  return (
                    <div
                      key={p.id}
                      onPointerDown={handlePointerDown(p.id)}
                      className="position-absolute d-flex flex-column align-items-center"
                      style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%,-50%)", cursor: editable ? "grab" : "default", touchAction: "none" }}
                      title={p.name}
                    >
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow-sm"
                        style={{ width: 34, height: 34, background: row.isCaptain ? "#c42221" : "#031521", fontSize: "0.8rem", border: "2px solid white" }}
                      >
                        {row.shirtNumber || p.number}
                      </div>
                      <span
                        className="text-white small text-center mt-1 text-truncate"
                        style={{ maxWidth: 70, textShadow: "0 1px 2px rgba(0,0,0,0.8)", fontSize: "0.7rem" }}
                      >
                        {row.isCaptain ? `${p.name} (C)` : p.name}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3">
                <div className="text-muted small mb-1">Remplaçants</div>
                <div className="d-flex flex-wrap gap-2">
                  {substitutes.length === 0 ? (
                    <span className="text-muted small">Aucun remplaçant sélectionné</span>
                  ) : (
                    substitutes.map((p) => (
                      <span key={p.id} className="badge bg-secondary-subtle text-dark border">
                        #{rows[p.id].shirtNumber || p.number} {p.name}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Effectif</h5>
            </div>
            <div className="card-body p-0">
              {players.length === 0 ? (
                <p className="text-muted mb-0 p-3">Aucun joueur actif dans l&apos;effectif</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: "70px" }}>N°</th>
                        <th>Joueur</th>
                        <th style={{ width: "230px" }}>Rôle</th>
                        <th style={{ width: "70px" }} className="text-center">
                          C
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
                                style={{ width: "60px" }}
                                value={row.shirtNumber}
                                disabled={row.role === "NONE" || !editable}
                                onChange={(e) => setShirtNumber(p.id, e.target.value)}
                                min={1}
                                max={99}
                              />
                            </td>
                            <td className="text-truncate">
                              {p.name}
                              {p.eligible === false && (
                                <span className="badge bg-danger-subtle text-danger ms-2" title={p.eligibilityReasons?.join(", ")}>
                                  🔴 {p.eligibilityReasons?.[0] ?? "Non éligible"}
                                </span>
                              )}
                            </td>
                            <td>
                              <div className="btn-group btn-group-sm" role="group">
                                <button
                                  type="button"
                                  className={`btn ${row.role === "NONE" ? "btn-secondary" : "btn-outline-secondary"}`}
                                  onClick={() => setRole(p.id, "NONE")}
                                  disabled={!editable}
                                >
                                  Aucun
                                </button>
                                <button
                                  type="button"
                                  className={`btn ${row.role === "STARTER" ? "btn-success" : "btn-outline-success"}`}
                                  onClick={() => setRole(p.id, "STARTER")}
                                  disabled={!editable || (row.role !== "STARTER" && starterCount >= 11)}
                                >
                                  Titulaire
                                </button>
                                <button
                                  type="button"
                                  className={`btn ${row.role === "SUBSTITUTE" ? "btn-info" : "btn-outline-info"}`}
                                  onClick={() => setRole(p.id, "SUBSTITUTE")}
                                  disabled={!editable}
                                >
                                  Remp.
                                </button>
                              </div>
                            </td>
                            <td className="text-center">
                              <input
                                type="radio"
                                name="captain"
                                className="form-check-input"
                                checked={row.isCaptain}
                                disabled={row.role === "NONE" || !editable}
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
          </div>
        </div>
      </div>
    </div>
  );
}
