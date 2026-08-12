"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";

export interface AudienceMismatchRow {
  id: string;
  reference: string;
  status: string;
  declaredAudienceLabel: string;
  matchLabel: string;
  matchDateLabel: string;
  categoryName: string;
  createdAtLabel: string;
}

const STATUS_KEYS = { PENDING: "status.pending", PAID: "status.paid", CANCELLED: "status.cancelled", USED: "status.used" } as const;

export function AudienceMismatchTable({ initialTickets }: { initialTickets: AudienceMismatchRow[] }) {
  const { t } = useI18n();
  const [tickets, setTickets] = useState(initialTickets);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDismiss(id: string) {
    setError(null);
    setPendingId(id);
    try {
      const res = await fetch(`/api/admin/tickets/audience-mismatch/${id}`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? t("admin.failed"));
      }
      setTickets((current) => current.filter((t) => t.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("admin.failed"));
    } finally {
      setPendingId(null);
    }
  }

  if (tickets.length === 0) {
    return <p style={{ color: "var(--tk-text-muted)" }}>{t("admin.empty")}</p>;
  }

  return (
    <div>
      {error && (
        <p style={{ color: "var(--tk-danger)", fontSize: "0.82rem", marginBottom: "0.75rem" }}>{error}</p>
      )}
      <div style={{ display: "grid", gap: "0.75rem" }}>
        {tickets.map((ticket) => (
          <div
            key={ticket.id}
            style={{
              background: "var(--tk-surface)",
              border: "1px solid var(--tk-border)",
              borderRadius: "var(--tk-radius-md)",
              padding: "1rem 1.15rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <strong>{ticket.matchLabel}</strong>
                <span style={{ fontSize: "0.72rem", color: "var(--tk-text-muted)" }}>
                  {ticket.status in STATUS_KEYS ? t(STATUS_KEYS[ticket.status as keyof typeof STATUS_KEYS]) : ticket.status}
                </span>
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--tk-text-muted)", marginTop: 4 }}>
                {ticket.matchDateLabel} · {ticket.categoryName} · {t("common.reference")} <code>{ticket.reference}</code>
              </div>
              <div style={{ fontSize: "0.78rem", marginTop: 4 }}>
                {t("admin.audience")} <strong>{ticket.declaredAudienceLabel}</strong> · {t("admin.boughtOn")} {" "}
                {ticket.createdAtLabel}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleDismiss(ticket.id)}
              disabled={pendingId === ticket.id}
              style={{
                fontSize: "0.78rem",
                fontWeight: 600,
                padding: "0.5rem 0.9rem",
                borderRadius: "var(--tk-radius-md)",
                border: "1px solid var(--tk-border)",
                background: "var(--tk-surface-alt)",
                color: "var(--tk-text)",
                cursor: pendingId === ticket.id ? "default" : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {pendingId === ticket.id ? "..." : t("admin.dismiss")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
