"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import type { TranslationKey } from "@/i18n/dictionaries";

interface RecentScanRow {
  id: string;
  result: "SUCCESS" | "ALREADY_VALIDATED_TODAY" | "NOT_PAID" | "NOT_YET_VALID" | "EXPIRED" | "REVOKED" | "INVALID";
  scannedBy: string;
  scannedAtLabel: string;
  reference: string | null;
}

const OUTCOME_KEYS: Record<RecentScanRow["result"], TranslationKey> = {
  SUCCESS: "subscriptionScanner.result.success",
  ALREADY_VALIDATED_TODAY: "subscriptionScanner.result.alreadyValidatedToday",
  NOT_PAID: "subscriptionScanner.result.notPaid",
  NOT_YET_VALID: "subscriptionScanner.result.notYetValid",
  EXPIRED: "subscriptionScanner.result.expired",
  REVOKED: "subscriptionScanner.result.revoked",
  INVALID: "subscriptionScanner.result.invalid",
};

const OUTCOME_COLORS: Record<RecentScanRow["result"], string> = {
  SUCCESS: "var(--tk-success)",
  ALREADY_VALIDATED_TODAY: "var(--tk-danger)",
  NOT_PAID: "var(--tk-danger)",
  NOT_YET_VALID: "var(--tk-danger)",
  EXPIRED: "var(--tk-danger)",
  REVOKED: "var(--tk-danger)",
  INVALID: "var(--tk-danger)",
};

interface ScanResponse {
  outcome: RecentScanRow["result"];
  reference?: string;
  categoryName?: string;
}

export function SubscriptionScanner({ initialScans }: { initialScans: RecentScanRow[] }) {
  const { t } = useI18n();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ScanResponse | null>(null);
  const [scans, setScans] = useState<RecentScanRow[]>(initialScans);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/subscriptions/scan", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });
      const body = (await res.json().catch(() => null)) as ScanResponse | { error?: string } | null;
      if (!res.ok || !body || !("outcome" in body)) {
        throw new Error((body as { error?: string } | null)?.error ?? t("subscriptionScanner.scanFailed"));
      }
      setLastResult(body);
      setScans((prev) => [
        {
          id: `${Date.now()}`,
          result: body.outcome,
          scannedBy: t("scanner.history.you"),
          scannedAtLabel: t("scanner.history.now"),
          reference: body.reference ?? null,
        },
        ...prev,
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("subscriptionScanner.scanFailed"));
    } finally {
      setToken("");
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder={t("subscriptionScanner.placeholder")}
          autoFocus
          style={{ flex: 1, padding: "0.6rem 0.75rem", border: "1px solid var(--tk-border)", borderRadius: 6 }}
        />
        <button
          type="submit"
          disabled={loading || !token.trim()}
          style={{
            background: "var(--tk-primary)",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "0.6rem 1.1rem",
            fontWeight: 600,
            cursor: "pointer",
            opacity: loading || !token.trim() ? 0.6 : 1,
          }}
        >
          {t("subscriptionScanner.submit")}
        </button>
      </form>

      {error && <div style={{ color: "var(--tk-danger)", fontSize: "0.85rem" }}>{error}</div>}

      {lastResult && (
        <div
          style={{
            border: `2px solid ${OUTCOME_COLORS[lastResult.outcome]}`,
            borderRadius: "var(--tk-radius-md)",
            padding: "1rem 1.15rem",
            textAlign: "center",
          }}
        >
          <strong style={{ color: OUTCOME_COLORS[lastResult.outcome], fontSize: "1.05rem" }}>
            {t(OUTCOME_KEYS[lastResult.outcome])}
          </strong>
          {lastResult.reference && (
            <div style={{ fontSize: "0.8rem", color: "var(--tk-text-muted)", marginTop: 6 }}>
              {t("subscriptionScanner.reference")} <code>{lastResult.reference}</code>
              {lastResult.categoryName ? ` · ${lastResult.categoryName}` : ""}
            </div>
          )}
        </div>
      )}

      <div>
        <h2 style={{ fontSize: "1rem", marginBottom: 8 }}>{t("subscriptionScanner.history.title")}</h2>
        {scans.length === 0 ? (
          <p style={{ fontSize: "0.82rem", color: "var(--tk-text-muted)" }}>{t("subscriptionScanner.history.empty")}</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 6 }}>
            {scans.map((scan) => (
              <li
                key={scan.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.8rem",
                  borderBottom: "1px solid var(--tk-border)",
                  paddingBottom: 6,
                }}
              >
                <span>
                  {scan.reference ? <code>{scan.reference}</code> : "—"} · {scan.scannedAtLabel}
                </span>
                <span style={{ color: OUTCOME_COLORS[scan.result] }}>{t(OUTCOME_KEYS[scan.result])}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
