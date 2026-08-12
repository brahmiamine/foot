"use client";

import { useEffect, useRef, useState } from "react";
import { CameraScanner } from "./CameraScanner";
import {
  clearManifest,
  enqueuePendingScan,
  evaluateOfflineScan,
  getLocallyUsedTicketIds,
  getPendingScans,
  loadManifest,
  markLocallyUsed,
  removePendingScan,
  saveManifest,
  type OfflineScanManifest,
  type PendingScan,
} from "@/lib/offlineScan";

export interface RecentScanRow {
  id: string;
  result: "SUCCESS" | "ALREADY_USED" | "NOT_PAID" | "MATCH_CANCELLED" | "INVALID";
  scannedBy: string;
  scannedAtLabel: string;
  reference: string | null;
}

export interface OpenMatchOption {
  id: string;
  label: string;
}

interface ScanResponse {
  outcome: RecentScanRow["result"];
  reference?: string;
  matchLabel?: string;
  categoryName?: string;
  usedAt?: string | null;
}

const OUTCOME_LABELS: Record<RecentScanRow["result"], string> = {
  SUCCESS: "Accès autorisé",
  ALREADY_USED: "Déjà scanné",
  NOT_PAID: "Billet non payé ou annulé",
  MATCH_CANCELLED: "Match annulé",
  INVALID: "Jeton invalide",
};

const OUTCOME_COLORS: Record<RecentScanRow["result"], string> = {
  SUCCESS: "var(--tk-success)",
  ALREADY_USED: "var(--tk-danger)",
  NOT_PAID: "var(--tk-danger)",
  MATCH_CANCELLED: "var(--tk-danger)",
  INVALID: "var(--tk-danger)",
};

export function TicketScanner({
  initialScans,
  openMatches,
}: {
  initialScans: RecentScanRow[];
  openMatches: OpenMatchOption[];
}) {
  const [token, setToken] = useState("");
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState(initialScans);
  const [cameraOn, setCameraOn] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- Mode hors-ligne (avancement.md, rang 2) ---
  // Lecture initiale paresseuse (pas dans un effet) : localStorage/navigator
  // sont des systèmes externes lus une fois au montage, pas une souscription
  // à synchroniser en continu — voir avancement.md, `arbinote`, pour le même
  // arbitrage sur react-hooks/set-state-in-effect.
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [offlineMode, setOfflineMode] = useState(false);
  const [manifest, setManifest] = useState<OfflineScanManifest | null>(() => loadManifest());
  const [selectedMatchId, setSelectedMatchId] = useState(openMatches[0]?.id ?? "");
  const [downloadingManifest, setDownloadingManifest] = useState(false);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingScan[]>(() => getPendingScans());
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  async function downloadManifest() {
    if (!selectedMatchId) return;
    setDownloadingManifest(true);
    setManifestError(null);
    try {
      const res = await fetch(`/api/admin/tickets/offline-manifest?matchId=${encodeURIComponent(selectedMatchId)}`, {
        credentials: "include",
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body) throw new Error((body && "error" in body ? body.error : null) ?? "Échec du téléchargement.");
      saveManifest(body as OfflineScanManifest);
      setManifest(body as OfflineScanManifest);
    } catch (e) {
      setManifestError(e instanceof Error ? e.message : "Échec du téléchargement.");
    } finally {
      setDownloadingManifest(false);
    }
  }

  function forgetManifest() {
    clearManifest();
    setManifest(null);
  }

  async function syncPending() {
    const queue = getPendingScans();
    if (queue.length === 0) return;
    setSyncing(true);
    setSyncMessage(null);
    let synced = 0;
    let failed = 0;
    for (const item of queue) {
      try {
        const res = await fetch("/api/admin/tickets/scan", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: item.token }),
        });
        if (!res.ok) throw new Error();
        removePendingScan(item.id);
        synced += 1;
      } catch {
        failed += 1;
      }
    }
    setPending(getPendingScans());
    setSyncMessage(
      failed === 0
        ? `${synced} scan(s) synchronisé(s).`
        : `${synced} scan(s) synchronisé(s), ${failed} échec(s) — reste en file, réessayez.`,
    );
    setSyncing(false);
  }

  function processOnlineResult(body: ScanResponse) {
    setLastResult(body);
    setRecentScans((current) => [
      {
        id: `${Date.now()}`,
        result: body.outcome,
        scannedBy: "vous",
        scannedAtLabel: "à l'instant",
        reference: body.reference ?? null,
      },
      ...current,
    ]);
  }

  async function scanOnline(value: string) {
    const res = await fetch("/api/admin/tickets/scan", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: value }),
    });
    const body = (await res.json().catch(() => null)) as ScanResponse | { error: string } | null;
    if (!res.ok || !body || "error" in body) {
      throw new Error((body && "error" in body ? body.error : null) ?? "Échec du scan.");
    }
    processOnlineResult(body);
  }

  function scanOffline(value: string) {
    if (!manifest) {
      setError("Téléchargez d'abord la liste hors-ligne pour ce match.");
      return;
    }
    const evaluation = evaluateOfflineScan(value, manifest, getLocallyUsedTicketIds());
    if (evaluation.outcome === "SUCCESS" && evaluation.reference) {
      const ticketId = manifest.tickets.find((t) => t.reference === evaluation.reference)?.ticketId;
      if (ticketId) markLocallyUsed(ticketId);
    }
    enqueuePendingScan(value);
    setPending(getPendingScans());
    setLastResult({ outcome: evaluation.outcome, reference: evaluation.reference, categoryName: evaluation.categoryName, matchLabel: manifest.matchLabel });
    setRecentScans((current) => [
      {
        id: `${Date.now()}`,
        result: evaluation.outcome,
        scannedBy: "vous (hors-ligne, à synchroniser)",
        scannedAtLabel: "à l'instant",
        reference: evaluation.reference ?? null,
      },
      ...current,
    ]);
  }

  async function submitToken(value: string) {
    const trimmed = value.trim();
    if (!trimmed || scanning) return;
    setScanning(true);
    setError(null);
    setLastResult(null);
    try {
      if (offlineMode) {
        scanOffline(trimmed);
      } else {
        await scanOnline(trimmed);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec du scan.");
    } finally {
      setToken("");
      setScanning(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          alignItems: "center",
          marginBottom: "1rem",
          fontSize: "0.8rem",
          color: "var(--tk-text-muted)",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: isOnline ? "var(--tk-success)" : "var(--tk-danger)",
              display: "inline-block",
            }}
          />
          {isOnline ? "Connecté" : "Hors connexion"}
        </span>
        <button
          type="button"
          onClick={() => setCameraOn((v) => !v)}
          style={{
            marginLeft: "auto",
            fontSize: "0.78rem",
            padding: "0.35rem 0.7rem",
            borderRadius: "var(--tk-radius-md)",
            border: "1px solid var(--tk-border)",
            background: cameraOn ? "var(--tk-surface-alt)" : "transparent",
            color: "var(--tk-text)",
            cursor: "pointer",
          }}
        >
          {cameraOn ? "Fermer la caméra" : "Utiliser la caméra"}
        </button>
        <button
          type="button"
          onClick={() => setOfflineMode((v) => !v)}
          style={{
            fontSize: "0.78rem",
            padding: "0.35rem 0.7rem",
            borderRadius: "var(--tk-radius-md)",
            border: "1px solid var(--tk-border)",
            background: offlineMode ? "var(--tk-surface-alt)" : "transparent",
            color: "var(--tk-text)",
            cursor: "pointer",
          }}
        >
          {offlineMode ? "Mode hors-ligne activé" : "Mode hors-ligne"}
        </button>
      </div>

      {offlineMode && (
        <div
          style={{
            border: "1px solid var(--tk-border)",
            borderRadius: "var(--tk-radius-md)",
            padding: "0.85rem 1rem",
            marginBottom: "1.25rem",
            fontSize: "0.82rem",
          }}
        >
          <p style={{ marginTop: 0, color: "var(--tk-text-muted)" }}>
            Téléchargez la liste des billets du match pendant que vous êtes encore connecté. Les scans faits
            hors-ligne sont mis en file et devront être synchronisés dès que la connexion revient — un jeton
            forgé accepté hors-ligne peut être rejeté à la synchronisation.
          </p>
          {manifest ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
              <span>
                Liste chargée : <strong>{manifest.matchLabel}</strong> ({manifest.tickets.length} billet(s),{" "}
                {new Date(manifest.generatedAt).toLocaleString("fr-FR")})
              </span>
              <button type="button" onClick={forgetManifest} style={{ fontSize: "0.75rem", cursor: "pointer" }}>
                Oublier cette liste
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
              <select
                value={selectedMatchId}
                onChange={(e) => setSelectedMatchId(e.target.value)}
                style={{ padding: "0.4rem 0.5rem", borderRadius: "var(--tk-radius-md)", border: "1px solid var(--tk-border)" }}
              >
                {openMatches.length === 0 && <option value="">Aucun match ouvert</option>}
                {openMatches.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={downloadManifest}
                disabled={!selectedMatchId || downloadingManifest}
                style={{ fontSize: "0.78rem", padding: "0.4rem 0.75rem", cursor: "pointer" }}
              >
                {downloadingManifest ? "Téléchargement..." : "Télécharger la liste hors-ligne"}
              </button>
            </div>
          )}
          {manifestError && <p style={{ color: "var(--tk-danger)", marginBottom: 0 }}>{manifestError}</p>}

          {pending.length > 0 && (
            <div style={{ marginTop: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
              <span>{pending.length} scan(s) en attente de synchronisation</span>
              <button
                type="button"
                onClick={syncPending}
                disabled={syncing || !isOnline}
                style={{ fontSize: "0.78rem", padding: "0.4rem 0.75rem", cursor: isOnline ? "pointer" : "not-allowed" }}
              >
                {syncing ? "Synchronisation..." : "Synchroniser"}
              </button>
            </div>
          )}
          {syncMessage && <p style={{ color: "var(--tk-text-muted)", marginTop: "0.5rem", marginBottom: 0 }}>{syncMessage}</p>}
        </div>
      )}

      {cameraOn && <CameraScanner onDetected={(value) => submitToken(value)} />}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitToken(token);
        }}
        style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}
      >
        <input
          ref={inputRef}
          autoFocus
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Scanner ou coller le contenu du QR code..."
          style={{
            flex: 1,
            padding: "0.65rem 0.85rem",
            borderRadius: "var(--tk-radius-md)",
            border: "1px solid var(--tk-border)",
            background: "var(--tk-surface)",
            color: "var(--tk-text)",
            fontSize: "0.9rem",
          }}
        />
        <button
          type="submit"
          disabled={scanning || !token.trim()}
          style={{
            fontSize: "0.85rem",
            fontWeight: 600,
            padding: "0.6rem 1.1rem",
            borderRadius: "var(--tk-radius-md)",
            border: "1px solid var(--tk-border)",
            background: "var(--tk-surface-alt)",
            color: "var(--tk-text)",
            cursor: scanning ? "default" : "pointer",
          }}
        >
          {scanning ? "..." : "Valider"}
        </button>
      </form>

      {error && (
        <p style={{ color: "var(--tk-danger)", fontSize: "0.85rem", marginBottom: "1rem" }}>{error}</p>
      )}

      {lastResult && (
        <div
          style={{
            border: `2px solid ${OUTCOME_COLORS[lastResult.outcome]}`,
            borderRadius: "var(--tk-radius-md)",
            padding: "1rem 1.15rem",
            marginBottom: "1.5rem",
          }}
        >
          <strong style={{ color: OUTCOME_COLORS[lastResult.outcome], fontSize: "1.05rem" }}>
            {OUTCOME_LABELS[lastResult.outcome]}
          </strong>
          {lastResult.matchLabel && (
            <div style={{ fontSize: "0.9rem", marginTop: 6 }}>{lastResult.matchLabel}</div>
          )}
          {lastResult.categoryName && (
            <div style={{ fontSize: "0.85rem", color: "var(--tk-text-muted)" }}>{lastResult.categoryName}</div>
          )}
          {lastResult.reference && (
            <div style={{ fontSize: "0.8rem", color: "var(--tk-text-muted)", marginTop: 4 }}>
              Réf. <code>{lastResult.reference}</code>
            </div>
          )}
          {lastResult.outcome === "ALREADY_USED" && lastResult.usedAt && (
            <div style={{ fontSize: "0.8rem", color: "var(--tk-text-muted)", marginTop: 4 }}>
              Déjà scanné le {new Date(lastResult.usedAt).toLocaleString("fr-FR")}
            </div>
          )}
        </div>
      )}

      <h2 style={{ fontSize: "0.95rem", marginBottom: "0.75rem" }}>Derniers scans</h2>
      {recentScans.length === 0 ? (
        <p style={{ color: "var(--tk-text-muted)", fontSize: "0.85rem" }}>Aucun scan pour l&rsquo;instant.</p>
      ) : (
        <div style={{ display: "grid", gap: "0.4rem" }}>
          {recentScans.map((scan) => (
            <div
              key={scan.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.8rem",
                padding: "0.5rem 0.75rem",
                borderRadius: "var(--tk-radius-md)",
                background: "var(--tk-surface)",
                border: "1px solid var(--tk-border)",
              }}
            >
              <span style={{ color: OUTCOME_COLORS[scan.result] }}>{OUTCOME_LABELS[scan.result]}</span>
              <span style={{ color: "var(--tk-text-muted)" }}>
                {scan.reference ? <code>{scan.reference}</code> : "—"} · {scan.scannedAtLabel}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
