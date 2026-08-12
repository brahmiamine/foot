"use client";

import { useI18n } from "@/i18n/provider";
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
  const { t } = useI18n();
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
      .catch((err) => setError(t("error.load")));
  }, [status]);

  useEffect(load, [load]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h1 style={{ fontSize: "1.3rem", margin: 0 }}>{t("seller.orders.title")}</h1>
          <p style={{ color: "var(--sp-text-muted)", fontSize: "0.85rem", margin: "4px 0 0" }}>{t("seller.orders.description")}</p>
        </div>
        <Link href="/orders/returns" style={{ fontSize: "0.82rem", color: "var(--sp-primary)", fontWeight: 600 }}>{t("seller.orders.viewReturns")}</Link>
      </div>

      <Card style={{ marginBottom: "1rem" }}>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 240 }}>
          <option value="">{t("seller.orders.allStatuses")}</option>
          {Object.entries(sellerOrderStatusMeta).map(([key, meta]) => (
            <option key={key} value={key}>
              {t(meta.key)}
            </option>
          ))}
        </Select>
      </Card>

      {error && <ErrorState message={error} onRetry={load} />}
      {!error && !items && <LoadingState />}
      {items && items.length === 0 && <EmptyState title={t("seller.orders.empty")} description={t("seller.orders.emptyDescription")} />}

      {items && items.length > 0 && (
        <Card padded={false}>
          <Table>
            <Thead>
              <Th>{t("seller.orders.order")}</Th>
              <Th>{t("seller.orders.customer")}</Th>
              <Th>{t("seller.orders.products")}</Th>
              <Th>{t("seller.orders.amount")}</Th>
              <Th>{t("common.status")}</Th>
              <Th>{t("common.date")}</Th>
            </Thead>
            <tbody>
              {items.map((o) => {
                const meta = sellerOrderStatusMeta[o.status];
  const metaLabel = meta ? t(meta.key) : o.status;
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
                      <Badge label={metaLabel} tone={meta?.tone} />
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
