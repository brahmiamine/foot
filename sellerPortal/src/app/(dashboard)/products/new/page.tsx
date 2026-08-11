"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea, Select } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/apiClient";

interface Category {
  id: string;
  name: string;
}

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    sku: "",
    price: "",
    compareAtPrice: "",
    categoryId: "",
    brand: "",
    shortDescription: "",
    description: "",
    taxRate: "0",
    weightKg: "",
    dimensions: "",
  });

  useEffect(() => {
    api.get<{ items: Category[] }>("/api/categories").then((res) => setCategories(res.items)).catch(() => {});
  }, []);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        sku: form.sku,
        price: Number(form.price),
        taxRate: Number(form.taxRate || 0),
      };
      if (form.compareAtPrice) payload.compareAtPrice = Number(form.compareAtPrice);
      if (form.categoryId) payload.categoryId = form.categoryId;
      if (form.brand) payload.brand = form.brand;
      if (form.shortDescription) payload.shortDescription = form.shortDescription;
      if (form.description) payload.description = form.description;
      if (form.weightKg) payload.weightKg = Number(form.weightKg);
      if (form.dimensions) payload.dimensions = form.dimensions;

      const res = await api.post<{ product: { id: string } }>("/api/products", payload);
      router.push(`/products/${res.product.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Création impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: "1.3rem", marginBottom: 4 }}>Nouveau produit</h1>
      <p style={{ color: "var(--sp-text-muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
        Le produit sera enregistré en brouillon. Vous pourrez ensuite ajouter des variantes, des images et le soumettre à
        validation.
      </p>

      <Card>
        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{ background: "var(--sp-danger-soft)", color: "var(--sp-danger)", padding: "0.6rem 0.8rem", borderRadius: 8, fontSize: "0.82rem", marginBottom: "1rem" }}>
              {error}
            </div>
          )}

          <FormField label="Nom du produit" required>
            <Input required value={form.name} onChange={(e) => set("name", e.target.value)} />
          </FormField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <FormField label="SKU" required>
              <Input required value={form.sku} onChange={(e) => set("sku", e.target.value)} />
            </FormField>
            <FormField label="Catégorie">
              <Select value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
            <FormField label="Prix (DT)" required>
              <Input type="number" step="0.001" min="0" required value={form.price} onChange={(e) => set("price", e.target.value)} />
            </FormField>
            <FormField label="Prix promo (DT)">
              <Input type="number" step="0.001" min="0" value={form.compareAtPrice} onChange={(e) => set("compareAtPrice", e.target.value)} />
            </FormField>
            <FormField label="TVA (%)">
              <Input type="number" step="0.01" min="0" value={form.taxRate} onChange={(e) => set("taxRate", e.target.value)} />
            </FormField>
          </div>

          <FormField label="Marque">
            <Input value={form.brand} onChange={(e) => set("brand", e.target.value)} />
          </FormField>

          <FormField label="Description courte">
            <Input value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} />
          </FormField>

          <FormField label="Description">
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} />
          </FormField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <FormField label="Poids (kg)">
              <Input type="number" step="0.001" min="0" value={form.weightKg} onChange={(e) => set("weightKg", e.target.value)} />
            </FormField>
            <FormField label="Dimensions" hint="Ex: 30x20x10 cm">
              <Input value={form.dimensions} onChange={(e) => set("dimensions", e.target.value)} />
            </FormField>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
            <Button type="submit" disabled={loading}>
              {loading ? "Création…" : "Enregistrer en brouillon"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.push("/products")}>
              Annuler
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
