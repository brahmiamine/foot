"use client";

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
  const [data, setData] = useState<Earnings | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api
      .get<Earnings>("/api/earnings")
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erreur de chargement."));
  }

  useEffect(load, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <LoadingState />;

  return (
    <div style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: "1.3rem", marginBottom: 4 }}>Revenus</h1>
      <p style={{ color: "var(--sp-text-muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
        Calculé automatiquement à partir de {data.ordersCount} commande{data.ordersCount > 1 ? "s" : ""}.
      </p>

      <Card>
        <Row label="Ventes brutes" value={formatCurrency(data.grossSales)} />
        <Row label="Commission club" value={`- ${formatCurrency(data.commission)}`} />
        <Row label="Remboursements" value={`- ${formatCurrency(data.refunds)}`} />
        <hr style={{ border: "none", borderTop: "1px solid var(--sp-border)", margin: "0.75rem 0" }} />
        <Row label="Net vendeur" value={formatCurrency(data.net)} bold />
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
