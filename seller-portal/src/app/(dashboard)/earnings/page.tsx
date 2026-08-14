"use client";

import { useI18n } from "@/i18n/provider";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { formatCurrency } from "@/lib/format";
import { api, ApiError } from "@/lib/apiClient";

interface Earnings {
  grossSales: number;
  commission: number;
  refunds: number;
  net: number;
  ordersCount: number;
}

export default function EarningsPage() {
  const { t } = useI18n();
  const [data, setData] = useState<Earnings | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api
      .get<Earnings>("/api/earnings")
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((err) => setError(t("error.load")));
  }

  useEffect(load, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <LoadingState />;

  return (
    <div style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: "1.3rem", marginBottom: 4 }}>{t("seller.earnings.title")}</h1>
      <p style={{ color: "var(--sp-text-muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
        {t("seller.earnings.calculation", { count: data.ordersCount })}
      </p>

      <Card>
        <Row label={t("seller.earnings.gross")} value={formatCurrency(data.grossSales)} />
        <Row label={t("seller.dashboard.clubCommission")} value={`- ${formatCurrency(data.commission)}`} />
        <Row label={t("seller.earnings.refunds")} value={`- ${formatCurrency(data.refunds)}`} />
        <hr style={{ border: "none", borderTop: "1px solid var(--sp-border)", margin: "0.75rem 0" }} />
        <Row label={t("seller.earnings.net")} value={formatCurrency(data.net)} bold />
      </Card>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", fontSize: bold ? "1.05rem" : "0.9rem", fontWeight: bold ? 700 : 500 }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
