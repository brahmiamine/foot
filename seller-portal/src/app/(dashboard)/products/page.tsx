"use client";

import { useI18n } from "@/i18n/provider";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Table, Thead, Th, Td, Tr } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { productStatusMeta } from "@/lib/statusLabels";
import { formatCurrency, formatDate } from "@/lib/format";
import { api, ApiError } from "@/lib/apiClient";

interface ProductRow {
  id: string;
  name: string;
  sku: string;
  categoryId: string | null;
  price: string;
  status: string;
  isActive: boolean;
  totalStock: number;
  createdAt: string;
}

export default function ProductsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [items, setItems] = useState<ProductRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(() => {
    setError(null);
    setItems(null);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (status) params.set("status", status);
    api
      .get<{ items: ProductRow[] }>(`/api/products?${params.toString()}`)
      .then((res) => setItems(res.items))
      .catch((err) => setError(t("error.load")));
  }, [query, status]);

  useEffect(() => {
    const timeout = setTimeout(load, 250);
    return () => clearTimeout(timeout);
  }, [load]);

  async function toggleActive(id: string) {
    await api.post(`/api/products/${id}/toggle-active`);
    load();
  }

  async function duplicate(id: string) {
    await api.post(`/api/products/${id}/duplicate`);
    load();
  }

  async function removeProduct(id: string) {
    if (!confirm(t("seller.products.removeConfirm"))) return;
    await api.delete(`/api/products/${id}`);
    load();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h1 style={{ fontSize: "1.3rem", margin: 0 }}>{t("seller.orders.products")}</h1>
          <p style={{ color: "var(--sp-text-muted)", fontSize: "0.85rem", margin: "4px 0 0" }}>{t("seller.products.description")}</p>
        </div>
        <Link href="/products/new">
          <Button>{t("seller.products.new")}</Button>
        </Link>
      </div>

      <Card style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Input placeholder={t("seller.products.search")} value={query} onChange={(e) => setQuery(e.target.value)} style={{ maxWidth: 320 }} />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 220 }}>
            <option value="">{t("seller.orders.allStatuses")}</option>
            {Object.entries(productStatusMeta).map(([key, meta]) => (
              <option key={key} value={key}>
                {t(meta.key)}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {error && <ErrorState message={error} onRetry={load} />}
      {!error && !items && <LoadingState />}
      {items && items.length === 0 && (
        <EmptyState
          title={t("seller.products.empty")}
          description={t("seller.products.emptyDescription")}
          action={
            <Link href="/products/new">
              <Button>{t("seller.products.new")}</Button>
            </Link>
          }
        />
      )}

      {items && items.length > 0 && (
        <Card padded={false}>
          <Table>
            <Thead>
              <Th>{t("seller.products.table.product")}</Th>
              <Th>{t("field.sku")}</Th>
              <Th>{t("field.price")}</Th>
              <Th>{t("seller.inventory.title")}</Th>
              <Th>{t("common.status")}</Th>
              <Th>{t("seller.products.table.validation")}</Th>
              <Th>{t("seller.products.table.created")}</Th>
              <Th>{t("common.actions")}</Th>
            </Thead>
            <tbody>
              {items.map((p) => {
                const meta = productStatusMeta[p.status];
  const metaLabel = meta ? t(meta.key) : p.status;
                return (
                  <Tr key={p.id}>
                    <Td>
                      <Link href={`/products/${p.id}`} style={{ fontWeight: 600, color: "var(--sp-primary)" }}>
                        {p.name}
                      </Link>
                    </Td>
                    <Td>{p.sku}</Td>
                    <Td>{formatCurrency(p.price)}</Td>
                    <Td>
                      <span style={{ color: p.totalStock <= 0 ? "var(--sp-danger)" : "inherit", fontWeight: p.totalStock <= 0 ? 700 : 400 }}>
                        {p.totalStock}
                      </span>
                    </Td>
                    <Td>
                      <Badge label={p.isActive ? t("common.active") : t("common.inactive")} tone={p.isActive ? "success" : "neutral"} />
                    </Td>
                    <Td>
                      <Badge label={metaLabel} tone={meta?.tone} />
                    </Td>
                    <Td>{formatDate(p.createdAt)}</Td>
                    <Td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => router.push(`/products/${p.id}`)} style={linkBtn}>{t("common.edit")}</button>
                        <button onClick={() => duplicate(p.id)} style={linkBtn}>{t("seller.products.duplicate")}</button>
                        <button onClick={() => toggleActive(p.id)} style={linkBtn}>
                          {p.isActive ? t("seller.products.deactivate") : t("seller.products.activate")}
                        </button>
                        <button onClick={() => removeProduct(p.id)} style={{ ...linkBtn, color: "var(--sp-danger)" }}>{t("common.delete")}</button>
                      </div>
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

const linkBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--sp-primary)",
  fontSize: "0.78rem",
  fontWeight: 600,
  cursor: "pointer",
  padding: 0,
};
