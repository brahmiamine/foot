"use client";

import { useState } from "react";
import { formatPriceTnd } from "@/lib/format";
import { useI18n } from "@/i18n/I18nProvider";

export function SubscriptionPurchaseForm({ subscriptionCategoryId, price }: { subscriptionCategoryId: string; price: string }) {
  const { locale, t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionCategoryId, quantity: 1 }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error ?? `Erreur ${res.status}`);
      }
      if (!body?.payUrl) {
        throw new Error(t("purchase.unexpected"));
      }
      window.location.href = body.payUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("purchase.failed"));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
      {error && <div style={{ color: "var(--tk-danger)", fontSize: "0.8rem" }}>{error}</div>}
      <button
        type="submit"
        disabled={loading}
        style={{
          background: "var(--tk-primary)",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          padding: "0.6rem 1rem",
          fontWeight: 600,
          cursor: "pointer",
          opacity: loading ? 0.6 : 1,
          alignSelf: "flex-start",
        }}
      >
        {loading ? "…" : t("subscriptions.buy", { price: formatPriceTnd(price, locale) })}
      </button>
    </form>
  );
}
