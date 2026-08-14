"use client";

import { useI18n } from "@/i18n/provider";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Table, Thead, Th, Td, Tr } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { returnStatusMeta } from "@/lib/statusLabels";
import { formatDate } from "@/lib/format";
import { api, ApiError } from "@/lib/apiClient";

interface ReturnRow {
  id: string;
  reason: string;
  status: string;
  customerName: string;
  createdAt: string;
  sellerOrder: { id: string; marketOrder?: { orderNumber: string } } | null;
  sellerOrderItem: { productName: string } | null;
}

export default function ReturnsPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<ReturnRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api
      .get<{ items: ReturnRow[] }>("/api/returns")
      .then((res) => {
        setItems(res.items);
        setError(null);
      })
      .catch((err) => setError(t("error.load")));
  }

  useEffect(load, []);

  return (
    <div>
      <h1 style={{ fontSize: "1.3rem", marginBottom: 4 }}>{t("seller.returns.title")}</h1>
      <p style={{ color: "var(--sp-text-muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>{t("seller.returns.description")}</p>

      {error && <ErrorState message={error} onRetry={load} />}
      {!error && !items && <LoadingState />}
      {items && items.length === 0 && <EmptyState title={t("seller.returns.empty")} />}

      {items && items.length > 0 && (
        <Card padded={false}>
          <Table>
            <Thead>
              <Th>{t("seller.orders.order")}</Th>
              <Th>{t("seller.products.table.product")}</Th>
              <Th>{t("seller.orders.customer")}</Th>
              <Th>{t("seller.returns.reason")}</Th>
              <Th>{t("common.date")}</Th>
              <Th>{t("common.status")}</Th>
            </Thead>
            <tbody>
              {items.map((r) => {
                const meta = returnStatusMeta[r.status];
  const metaLabel = meta ? t(meta.key) : r.status;
                return (
                  <Tr key={r.id}>
                    <Td>#{r.sellerOrder?.marketOrder?.orderNumber ?? r.sellerOrder?.id.slice(0, 8)}</Td>
                    <Td>{r.sellerOrderItem?.productName ?? "—"}</Td>
                    <Td>{r.customerName}</Td>
                    <Td>{r.reason}</Td>
                    <Td>{formatDate(r.createdAt)}</Td>
                    <Td>
                      <Badge label={metaLabel} tone={meta?.tone} />
                    </Td>
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
