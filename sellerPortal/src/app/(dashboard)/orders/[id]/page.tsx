"use client";

import { useI18n } from "@/i18n/provider";
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
  const { t } = useI18n();
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
      .catch((err) => setError(t("error.load")));
  }

  useEffect(load, [id]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!order) return <LoadingState />;

  const meta = sellerOrderStatusMeta[order.status];
  const metaLabel = meta ? t(meta.key) : order.status;
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
      <button onClick={() => router.push("/orders")} style={{ background: "none", border: "none", color: "var(--sp-primary)", fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: 12 }}>{t("seller.order.back")}</button>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: "1.3rem", margin: 0 }}>{t("seller.order.number", { number: order.marketOrder?.orderNumber ?? order.id.slice(0, 8) })}</h1>
        <Badge label={metaLabel} tone={meta?.tone} />
      </div>
      <p style={{ color: "var(--sp-text-muted)", fontSize: "0.82rem", marginBottom: "1.25rem" }}>{formatDateTime(order.createdAt)}</p>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.25rem" }}>
        <Card padded={false}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--sp-border)" }}>
            <strong>{t("seller.orders.products")}</strong>
          </div>
          <Table>
            <Thead>
              <Th>{t("seller.products.table.product")}</Th>
              <Th>{t("seller.order.quantity")}</Th>
              <Th>{t("seller.order.unitPrice")}</Th>
              <Th>{t("common.total")}</Th>
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
            <Row label={t("seller.order.subtotal")} value={formatCurrency(order.subtotal)} />
            <Row label={t("seller.dashboard.clubCommission")} value={`- ${formatCurrency(order.commissionAmount)}`} />
            <Row label={t("seller.dashboard.net")} value={formatCurrency(order.netAmount)} bold />
          </div>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <Card>
            <strong style={{ display: "block", marginBottom: 8 }}>{t("seller.orders.customer")}</strong>
            <p style={{ margin: 0, fontSize: "0.85rem" }}>{order.marketOrder?.customerName}</p>
            <p style={{ margin: "2px 0 0", fontSize: "0.85rem", color: "var(--sp-text-muted)" }}>{order.marketOrder?.customerEmail}</p>
            {order.marketOrder?.customerPhone && <p style={{ margin: "2px 0 0", fontSize: "0.85rem", color: "var(--sp-text-muted)" }}>{order.marketOrder.customerPhone}</p>}
            {order.marketOrder?.shippingAddress && <p style={{ margin: "8px 0 0", fontSize: "0.82rem" }}>{order.marketOrder.shippingAddress}</p>}
          </Card>

          <Card>
            <strong style={{ display: "block", marginBottom: 8 }}>{t("seller.order.shipping")}</strong>
            {order.shippingCarrier ? (
              <>
                <p style={{ margin: 0, fontSize: "0.85rem" }}>{order.shippingCarrier}</p>
                <p style={{ margin: "2px 0 0", fontSize: "0.85rem", color: "var(--sp-text-muted)" }}>{t("seller.order.tracking", { number: order.trackingNumber ?? "" })}</p>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--sp-text-muted)" }}>{t("seller.order.notShipped")}</p>
            )}

            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {action && (
                <Button onClick={advance} disabled={updating}>
                  {updating ? "…" : action.label}
                </Button>
              )}
              {order.status === "READY_TO_SHIP" && (
                <Button variant="secondary" onClick={() => router.push(`/orders/${id}/shipping`)}>{t("seller.order.addShipping")}</Button>
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
