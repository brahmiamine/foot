"use client";

import { useRef, useState } from "react";

export interface RecentScanRow {
  id: string;
  result: "SUCCESS" | "ALREADY_USED" | "NOT_PAID" | "MATCH_CANCELLED" | "INVALID";
  scannedBy: string;
  scannedAtLabel: string;
  reference: string | null;
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

export function TicketScanner({ initialScans }: { initialScans: RecentScanRow[] }) {
  const [token, setToken] = useState("");
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState(initialScans);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim() || scanning) return;
    setScanning(true);
    setError(null);
    setLastResult(null);
    try {
      const res = await fetch("/api/admin/tickets/scan", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });
      const body = (await res.json().catch(() => null)) as ScanResponse | { error: string } | null;
      if (!res.ok || !body || "error" in body) {
        throw new Error((body && "error" in body ? body.error : null) ?? "Échec du scan.");
      }
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
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
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
