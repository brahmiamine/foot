"use client";

import { useEffect, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, Thead, Th, Td, Tr } from "@/components/ui/Table";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { sellerOrderStatusMeta } from "@/lib/statusLabels";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { api, ApiError } from "@/lib/apiClient";

interface OrderItem {
  id: string;
  productName: string;
  sku: string;
  variantLabel: string | null;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

interface OrderDetail {
  id: string;
  status: string;
  subtotal: string;
  commissionAmount: string;
  netAmount: string;
  shippingCarrier: string | null;
  trackingNumber: string | null;
  createdAt: string;
  marketOrder: { orderNumber: string; customerName: string; customerEmail: string; customerPhone: string | null; shippingAddress: string | null } | null;
  items: OrderItem[];
}

const NEXT_STATUS: Record<string, { next: string; label: string }> = {
  PENDING: { next: "CONFIRMED", label: "Confirmer la commande" },
  CONFIRMED: { next: "PROCESSING", label: "Démarrer la préparation" },
  PROCESSING: { next: "READY_TO_SHIP", label: "Marquer prêt à expédier" },
};

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  function load() {
    api
      .get<{ order: OrderDetail }>(`/api/orders/${id}`)
      .then((res) => {
        setOrder(res.order);
        setError(null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erreur de chargement."));
  }

  useEffect(load, [id]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!order) return <LoadingState />;

  const meta = sellerOrderStatusMeta[order.status] ?? { label: order.status, tone: "neutral" as const };
  const action = NEXT_STATUS[order.status];

  async function advance() {
    if (!action) return;
    setUpdating(true);
    try {
      await api.post(`/api/orders/${id}/status`, { status: action.next });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Transition impossible.");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div style={{ maxWidth: 780 }}>
      <button onClick={() => router.push("/orders")} style={{ background: "none", border: "none", color: "var(--sp-primary)", fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: 12 }}>
        ← Retour aux commandes
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: "1.3rem", margin: 0 }}>Commande #{order.marketOrder?.orderNumber ?? order.id.slice(0, 8)}</h1>
        <Badge label={meta.label} tone={meta.tone} />
      </div>
      <p style={{ color: "var(--sp-text-muted)", fontSize: "0.82rem", marginBottom: "1.25rem" }}>{formatDateTime(order.createdAt)}</p>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.25rem" }}>
        <Card padded={false}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--sp-border)" }}>
            <strong>Produits</strong>
          </div>
          <Table>
            <Thead>
              <Th>Produit</Th>
              <Th>Qté</Th>
              <Th>Prix unitaire</Th>
              <Th>Total</Th>
            </Thead>
            <tbody>
              {order.items.map((it) => (
                <Tr key={it.id}>
                  <Td>
                    {it.productName}
                    {it.variantLabel && <span style={{ color: "var(--sp-text-muted)" }}> ({it.variantLabel})</span>}
                  </Td>
                  <Td>{it.quantity}</Td>
                  <Td>{formatCurrency(it.unitPrice)}</Td>
                  <Td>{formatCurrency(it.totalPrice)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>

          <div style={{ padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: 4, fontSize: "0.85rem" }}>
            <Row label="Sous-total" value={formatCurrency(order.subtotal)} />
            <Row label="Commission club" value={`- ${formatCurrency(order.commissionAmount)}`} />
            <Row label="Montant net" value={formatCurrency(order.netAmount)} bold />
          </div>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <Card>
            <strong style={{ display: "block", marginBottom: 8 }}>Client</strong>
            <p style={{ margin: 0, fontSize: "0.85rem" }}>{order.marketOrder?.customerName}</p>
            <p style={{ margin: "2px 0 0", fontSize: "0.85rem", color: "var(--sp-text-muted)" }}>{order.marketOrder?.customerEmail}</p>
            {order.marketOrder?.customerPhone && <p style={{ margin: "2px 0 0", fontSize: "0.85rem", color: "var(--sp-text-muted)" }}>{order.marketOrder.customerPhone}</p>}
            {order.marketOrder?.shippingAddress && <p style={{ margin: "8px 0 0", fontSize: "0.82rem" }}>{order.marketOrder.shippingAddress}</p>}
          </Card>

          <Card>
            <strong style={{ display: "block", marginBottom: 8 }}>Livraison</strong>
            {order.shippingCarrier ? (
              <>
                <p style={{ margin: 0, fontSize: "0.85rem" }}>{order.shippingCarrier}</p>
                <p style={{ margin: "2px 0 0", fontSize: "0.85rem", color: "var(--sp-text-muted)" }}>Suivi : {order.trackingNumber}</p>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--sp-text-muted)" }}>Pas encore expédiée.</p>
            )}

            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {action && (
                <Button onClick={advance} disabled={updating}>
                  {updating ? "…" : action.label}
                </Button>
              )}
              {order.status === "READY_TO_SHIP" && (
                <Button variant="secondary" onClick={() => router.push(`/orders/${id}/shipping`)}>
                  Renseigner l&rsquo;expédition
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: bold ? 700 : 400 }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
