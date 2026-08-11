"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { api, ApiError } from "@/lib/apiClient";

interface Category {
  id: string;
  name: string;
  slug: string;
  commissionRate: string | null;
}

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api
      .get<{ items: Category[] }>("/api/categories")
      .then((res) => {
        setItems(res.items);
        setError(null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erreur de chargement."));
  }

  useEffect(load, []);

  return (
    <div>
      <h1 style={{ fontSize: "1.3rem", marginBottom: 4 }}>Catégories</h1>
      <p style={{ color: "var(--sp-text-muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
        Référentiel géré par l&rsquo;Olympique de Béja — utilisé pour classer vos produits.
      </p>

      {error && <ErrorState message={error} onRetry={load} />}
      {!error && !items && <LoadingState />}
      {items && items.length === 0 && <EmptyState title="Aucune catégorie disponible" description="Contactez l'OB pour l'ouverture de nouvelles catégories." />}
      {items && items.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.85rem" }}>
          {items.map((c) => (
            <Card key={c.id}>
              <strong>{c.name}</strong>
              <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "var(--sp-text-muted)" }}>
                {c.commissionRate ? `Commission spécifique : ${c.commissionRate}%` : "Commission par défaut du vendeur"}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
