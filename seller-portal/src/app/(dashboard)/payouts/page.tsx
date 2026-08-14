"use client";

import { useI18n } from "@/i18n/provider";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Table, Thead, Th, Td, Tr } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { payoutStatusMeta } from "@/lib/statusLabels";
import { formatCurrency, formatDate } from "@/lib/format";
import { api, ApiError } from "@/lib/apiClient";

interface Payout {
  id: string;
  reference: string;
  amount: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  paidAt: string | null;
  createdAt: string;
}

export default function PayoutsPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<Payout[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api
      .get<{ items: Payout[] }>("/api/payouts")
      .then((res) => {
        setItems(res.items);
        setError(null);
      })
      .catch((err) => setError(t("error.load")));
  }

  useEffect(load, []);

  return (
    <div>
      <h1 style={{ fontSize: "1.3rem", marginBottom: 4 }}>{t("seller.payouts.title")}</h1>
      <p style={{ color: "var(--sp-text-muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>{t("seller.payouts.description")}</p>

      {error && <ErrorState message={error} onRetry={load} />}
      {!error && !items && <LoadingState />}
      {items && items.length === 0 && <EmptyState title={t("seller.payouts.empty")} />}

      {items && items.length > 0 && (
        <Card padded={false}>
          <Table>
            <Thead>
              <Th>{t("seller.payouts.reference")}</Th>
              <Th>{t("seller.payouts.period")}</Th>
              <Th>{t("seller.orders.amount")}</Th>
              <Th>{t("common.status")}</Th>
              <Th>{t("seller.payouts.paymentDate")}</Th>
            </Thead>
            <tbody>
              {items.map((p) => {
                const meta = payoutStatusMeta[p.status];
  const metaLabel = meta ? t(meta.key) : p.status;
                return (
                  <Tr key={p.id}>
                    <Td style={{ fontWeight: 600 }}>#{p.reference}</Td>
                    <Td>
                      {formatDate(p.periodStart)} → {formatDate(p.periodEnd)}
                    </Td>
                    <Td>{formatCurrency(p.amount)}</Td>
                    <Td>
                      <Badge label={metaLabel} tone={meta?.tone} />
                    </Td>
                    <Td>{p.paidAt ? formatDate(p.paidAt) : "—"}</Td>
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
