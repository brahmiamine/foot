"use client";

import { useState } from "react";
import type { SecurityEventType } from "@/lib/securityLog";
import { useI18n } from "@/i18n/provider";
import type { TranslationKey } from "@/i18n";

export interface SecurityEventRowSerialized {
  id: string;
  type: SecurityEventType;
  email: string | null;
  userId: string | null;
  ip: string | null;
  createdAt: string;
}

const EVENT_LABELS: Record<SecurityEventType, TranslationKey> = {
  LOGIN_FAILED: "account.securityEvents.event.LOGIN_FAILED",
  LOGIN_RATE_LIMITED: "account.securityEvents.event.LOGIN_RATE_LIMITED",
  MFA_FAILED: "account.securityEvents.event.MFA_FAILED",
  PASSWORD_RESET_REQUESTED: "account.securityEvents.event.PASSWORD_RESET_REQUESTED",
  PASSWORD_RESET_COMPLETED: "account.securityEvents.event.PASSWORD_RESET_COMPLETED",
  PASSWORD_RESET_FAILED: "account.securityEvents.event.PASSWORD_RESET_FAILED",
  PASSWORD_CHANGED: "account.securityEvents.event.PASSWORD_CHANGED",
  PASSWORD_CHANGE_FAILED: "account.securityEvents.event.PASSWORD_CHANGE_FAILED",
};

function formatDate(iso: string, locale: "fr" | "ar"): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-TN" : "fr-FR", { dateStyle: "short", timeStyle: "medium" }).format(new Date(iso));
}

const PAGE_SIZE = 25;

export default function SecurityEventsTable({
  initialEvents,
  initialTotal,
}: {
  initialEvents: SecurityEventRowSerialized[];
  initialTotal: number;
}) {
  const { locale, t } = useI18n();
  const number = new Intl.NumberFormat(locale === "ar" ? "ar-TN" : "fr-FR");
  const [events, setEvents] = useState(initialEvents);
  const [total, setTotal] = useState(initialTotal);
  const [type, setType] = useState<string>("");
  const [email, setEmail] = useState("");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);

  async function load(nextOffset: number, nextType: string, nextEmail: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(nextOffset) });
      if (nextType) params.set("type", nextType);
      if (nextEmail) params.set("email", nextEmail);
      const res = await fetch(`/api/security-events?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      setEvents(data.events);
      setTotal(data.total);
      setOffset(nextOffset);
    } finally {
      setLoading(false);
    }
  }

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault();
    load(0, type, email);
  }

  return (
    <div>
      <form onSubmit={handleFilterSubmit} style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="sso-filter-select"
          style={{ padding: 8, borderRadius: 8, border: "1px solid var(--sso-border)", background: "var(--sso-bg)", color: "var(--sso-text)" }}
        >
          <option value="">{t("account.securityEvents.allTypes")}</option>
          {Object.entries(EVENT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {t(label)}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder={t("account.securityEvents.emailFilter")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: 8, borderRadius: 8, border: "1px solid var(--sso-border)", background: "var(--sso-bg)", color: "var(--sso-text)", flex: 1, minWidth: 160 }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--sso-accent)", color: "white", fontWeight: 600 }}
        >
          {t("account.securityEvents.filter")}
        </button>
      </form>

      {events.length === 0 ? (
        <p className="sso-muted">{t("account.securityEvents.empty")}</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--sso-border)" }}>
                <th style={{ padding: "8px 6px" }}>{t("account.securityEvents.type")}</th>
                <th style={{ padding: "8px 6px" }}>{t("account.securityEvents.email")}</th>
                <th style={{ padding: "8px 6px" }}>{t("account.securityEvents.ip")}</th>
                <th style={{ padding: "8px 6px" }}>{t("account.securityEvents.date")}</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} style={{ borderBottom: "1px solid var(--sso-border)" }}>
                  <td style={{ padding: "8px 6px" }}>{EVENT_LABELS[event.type] ? t(EVENT_LABELS[event.type]) : event.type}</td>
                  <td style={{ padding: "8px 6px" }}>{event.email ?? "—"}</td>
                  <td style={{ padding: "8px 6px" }}>{event.ip ?? "—"}</td>
                  <td style={{ padding: "8px 6px" }}>{formatDate(event.createdAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, fontSize: "0.8125rem" }}>
        <span className="sso-muted">
          {total === 0 ? t("account.securityEvents.resultsZero") : t("account.securityEvents.results", { start: number.format(offset + 1), end: number.format(Math.min(offset + events.length, total)), total: number.format(total) })}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            disabled={loading || offset === 0}
            onClick={() => load(Math.max(0, offset - PAGE_SIZE), type, email)}
            style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--sso-border)", background: "var(--sso-bg)", color: "var(--sso-text)" }}
          >
            {t("account.securityEvents.previous")}
          </button>
          <button
            type="button"
            disabled={loading || offset + PAGE_SIZE >= total}
            onClick={() => load(offset + PAGE_SIZE, type, email)}
            style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--sso-border)", background: "var(--sso-bg)", color: "var(--sso-text)" }}
          >
            {t("account.securityEvents.next")}
          </button>
        </div>
      </div>
    </div>
  );
}
