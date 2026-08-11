"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Field";
import { Table, Thead, Th, Td, Tr } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { sellerOrderStatusMeta } from "@/lib/statusLabels";
import { formatCurrency, formatDate } from "@/lib/format";
import { api, ApiError } from "@/lib/apiClient";

interface OrderRow {
  id: string;
  status: string;
  subtotal: string;
  createdAt: string;
  marketOrder: { orderNumber: string; customerName: string } | null;
  items: { productName: string; quantity: number }[];
}

export default function OrdersPage() {
  const [items, setItems] = useState<OrderRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    api
      .get<{ items: OrderRow[] }>(`/api/orders?${params.toString()}`)
      .then((res) => {
        setItems(res.items);
        setError(null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erreur de chargement."));
  }, [status]);

  useEffect(load, [load]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h1 style={{ fontSize: "1.3rem", margin: 0 }}>Commandes</h1>
          <p style={{ color: "var(--sp-text-muted)", fontSize: "0.85rem", margin: "4px 0 0" }}>
            Vous ne voyez que les commandes contenant vos produits.
          </p>
        </div>
        <Link href="/orders/returns" style={{ fontSize: "0.82rem", color: "var(--sp-primary)", fontWeight: 600 }}>
          Voir les retours →
        </Link>
      </div>

      <Card style={{ marginBottom: "1rem" }}>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 240 }}>
          <option value="">Tous les statuts</option>
          {Object.entries(sellerOrderStatusMeta).map(([key, meta]) => (
            <option key={key} value={key}>
              {meta.label}
            </option>
          ))}
        </Select>
      </Card>

      {error && <ErrorState message={error} onRetry={load} />}
      {!error && !items && <LoadingState />}
      {items && items.length === 0 && <EmptyState title="Aucune commande" description="Vos commandes apparaîtront ici dès qu'un client achètera vos produits." />}

      {items && items.length > 0 && (
        <Card padded={false}>
          <Table>
            <Thead>
              <Th>Commande</Th>
              <Th>Client</Th>
              <Th>Produits</Th>
              <Th>Montant</Th>
              <Th>Statut</Th>
              <Th>Date</Th>
            </Thead>
            <tbody>
              {items.map((o) => {
                const meta = sellerOrderStatusMeta[o.status] ?? { label: o.status, tone: "neutral" as const };
                return (
                  <Tr key={o.id} onClick={() => (window.location.href = `/orders/${o.id}`)}>
                    <Td style={{ fontWeight: 600 }}>
                      <Link href={`/orders/${o.id}`} style={{ color: "var(--sp-primary)" }}>
                        #{o.marketOrder?.orderNumber ?? o.id.slice(0, 8)}
                      </Link>
                    </Td>
                    <Td>{o.marketOrder?.customerName ?? "—"}</Td>
                    <Td>{o.items.map((it) => `${it.productName} × ${it.quantity}`).join(", ")}</Td>
                    <Td>{formatCurrency(o.subtotal)}</Td>
                    <Td>
                      <Badge label={meta.label} tone={meta.tone} />
                    </Td>
                    <Td>{formatDate(o.createdAt)}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
