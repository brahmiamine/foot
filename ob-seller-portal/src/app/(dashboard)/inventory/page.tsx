"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { Table, Thead, Th, Td, Tr } from "@/components/ui/Table";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { api, ApiError } from "@/lib/apiClient";

interface InventoryRow {
  id: string;
  available: number;
  reserved: number;
  sold: number;
  product: { id: string; name: string } | null;
  variant: { id: string; sku: string; attributes: Record<string, string> } | null;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    setItems(null);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    api
      .get<{ items: InventoryRow[] }>(`/api/inventory?${params.toString()}`)
      .then((res) => setItems(res.items))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erreur de chargement."));
  }, [query]);

  useEffect(() => {
    const timeout = setTimeout(load, 250);
    return () => clearTimeout(timeout);
  }, [load]);

  async function saveStock(id: string) {
    const raw = editing[id];
    if (raw === undefined) return;
    const available = Math.max(0, parseInt(raw, 10) || 0);
    setSavingId(id);
    try {
      await api.patch(`/api/inventory/${id}`, { available });
      load();
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: "1.3rem", marginBottom: 4 }}>Stock</h1>
      <p style={{ color: "var(--sp-text-muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
        Le stock réservé et vendu est calculé automatiquement à partir des commandes — seul le stock disponible est
        modifiable ici.
      </p>

      <Card style={{ marginBottom: "1rem" }}>
        <Input placeholder="Rechercher un produit ou un SKU…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ maxWidth: 320 }} />
      </Card>

      {error && <ErrorState message={error} onRetry={load} />}
      {!error && !items && <LoadingState />}
      {items && items.length === 0 && <EmptyState title="Aucune ligne de stock" description="Ajoutez des produits pour gérer votre stock." />}

      {items && items.length > 0 && (
        <Card padded={false}>
          <Table>
            <Thead>
              <Th>Produit</Th>
              <Th>Variante</Th>
              <Th>Disponible</Th>
              <Th>Réservé</Th>
              <Th>Vendu</Th>
              <Th>Total</Th>
              <Th></Th>
            </Thead>
            <tbody>
              {items.map((item) => {
                const total = item.available + item.reserved + item.sold;
                const value = editing[item.id] ?? String(item.available);
                const dirty = value !== String(item.available);
                return (
                  <Tr key={item.id}>
                    <Td>{item.product?.name ?? "—"}</Td>
                    <Td>
                      {item.variant ? (
                        <>
                          {item.variant.sku} —{" "}
                          {Object.entries(item.variant.attributes)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(", ")}
                        </>
                      ) : (
                        "Produit simple"
                      )}
                    </Td>
                    <Td>
                      <Input
                        type="number"
                        min="0"
                        value={value}
                        onChange={(e) => setEditing((s) => ({ ...s, [item.id]: e.target.value }))}
                        style={{ width: 90 }}
                      />
                    </Td>
                    <Td>{item.reserved}</Td>
                    <Td>{item.sold}</Td>
                    <Td style={{ fontWeight: 600 }}>{total}</Td>
                    <Td>
                      {dirty && (
                        <button
                          onClick={() => saveStock(item.id)}
                          disabled={savingId === item.id}
                          style={{ background: "none", border: "none", color: "var(--sp-primary)", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer" }}
                        >
                          {savingId === item.id ? "…" : "Enregistrer"}
                        </button>
                      )}
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
