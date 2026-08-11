"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatCard, Card } from "@/components/ui/Card";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { Badge } from "@/components/ui/Badge";
import { sellerOrderStatusMeta } from "@/lib/statusLabels";
import { formatCurrency, formatDate } from "@/lib/format";
import { api, ApiError } from "@/lib/apiClient";

interface SummaryOrder {
  id: string;
  status: string;
  subtotal: string;
  createdAt: string;
  items: { productName: string; quantity: number }[];
}

interface Summary {
  sellerName: string;
  sellerStatus: string;
  activeProducts: number;
  pendingOrders: number;
  readyToShipOrders: number;
  lowStockCount: number;
  lowStockProducts: { id: string; productName: string }[];
  sales: number;
  commission: number;
  net: number;
  recentOrders: SummaryOrder[];
}

export default function DashboardPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api
      .get<Summary>("/api/dashboard/summary")
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
    <div>
      <h1 style={{ fontSize: "1.3rem", marginBottom: 4 }}>Bonjour {data.sellerName}</h1>
      <p style={{ color: "var(--sp-text-muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
        Voici un résumé de votre activité sur la marketplace.
      </p>

      {data.sellerStatus === "PENDING" && (
        <Card style={{ background: "var(--sp-warning-soft)", borderColor: "#fde68a", marginBottom: "1.5rem" }}>
          <strong>Compte en attente de validation.</strong>
          <p style={{ margin: "4px 0 0", fontSize: "0.85rem" }}>
            L&rsquo;Olympique de Béja doit approuver votre inscription avant que vous puissiez publier des produits.
          </p>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <StatCard label="Produits actifs" value={String(data.activeProducts)} tone="primary" />
        <StatCard label="Commandes en attente" value={String(data.pendingOrders)} tone="warning" />
        <StatCard label="Commandes à expédier" value={String(data.readyToShipOrders)} tone="warning" />
        <StatCard label="Produits en rupture" value={String(data.lowStockCount)} tone={data.lowStockCount ? "danger" : "neutral"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <StatCard label="Ventes" value={formatCurrency(data.sales)} tone="primary" />
        <StatCard label="Commission OB" value={formatCurrency(data.commission)} />
        <StatCard label="Montant net" value={formatCurrency(data.net)} tone="primary" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
        <Card padded={false}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--sp-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>Commandes récentes</strong>
            <Link href="/orders" style={{ fontSize: "0.8rem", color: "var(--sp-primary)", fontWeight: 600 }}>
              Voir tout
            </Link>
          </div>
          {data.recentOrders.length === 0 ? (
            <p style={{ padding: "1.25rem", color: "var(--sp-text-muted)", fontSize: "0.85rem" }}>Aucune commande pour le moment.</p>
          ) : (
            <div>
              {data.recentOrders.map((o) => {
                const meta = sellerOrderStatusMeta[o.status] ?? { label: o.status, tone: "neutral" as const };
                return (
                  <Link
                    key={o.id}
                    href={`/orders/${o.id}`}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.85rem 1.25rem", borderBottom: "1px solid var(--sp-border)" }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                        {o.items.map((it) => `${it.productName} × ${it.quantity}`).join(", ")}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--sp-text-subtle)" }}>{formatDate(o.createdAt)}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{formatCurrency(o.subtotal)}</span>
                      <Badge label={meta.label} tone={meta.tone} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        <Card padded={false}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--sp-border)" }}>
            <strong>Produits en rupture</strong>
          </div>
          {data.lowStockProducts.length === 0 ? (
            <p style={{ padding: "1.25rem", color: "var(--sp-text-muted)", fontSize: "0.85rem" }}>Aucune rupture de stock.</p>
          ) : (
            <div>
              {data.lowStockProducts.map((p) => (
                <Link key={p.id} href="/inventory" style={{ display: "block", padding: "0.75rem 1.25rem", borderBottom: "1px solid var(--sp-border)", fontSize: "0.85rem" }}>
                  {p.productName}
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
