"use client";

import { useI18n } from "@/i18n/provider";
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
  const { t } = useI18n();
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
      <h1 style={{ fontSize: "1.3rem", marginBottom: 4 }}>{t("seller.products.newTitle")}</h1>
      <p style={{ color: "var(--sp-text-muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>{t("seller.products.draftHint")}</p>

      <Card>
        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{ background: "var(--sp-danger-soft)", color: "var(--sp-danger)", padding: "0.6rem 0.8rem", borderRadius: 8, fontSize: "0.82rem", marginBottom: "1rem" }}>
              {error}
            </div>
          )}

          <FormField label={t("field.productName")} required>
            <Input required value={form.name} onChange={(e) => set("name", e.target.value)} />
          </FormField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <FormField label={t("field.sku")} required>
              <Input required value={form.sku} onChange={(e) => set("sku", e.target.value)} />
            </FormField>
            <FormField label={t("field.category")}>
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
            <FormField label={t("field.priceTnd")} required>
              <Input type="number" step="0.001" min="0" required value={form.price} onChange={(e) => set("price", e.target.value)} />
            </FormField>
            <FormField label={t("field.salePriceTnd")}>
              <Input type="number" step="0.001" min="0" value={form.compareAtPrice} onChange={(e) => set("compareAtPrice", e.target.value)} />
            </FormField>
            <FormField label={t("field.taxRate")}>
              <Input type="number" step="0.01" min="0" value={form.taxRate} onChange={(e) => set("taxRate", e.target.value)} />
            </FormField>
          </div>

          <FormField label={t("field.brand")}>
            <Input value={form.brand} onChange={(e) => set("brand", e.target.value)} />
          </FormField>

          <FormField label={t("field.shortDescription")}>
            <Input value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} />
          </FormField>

          <FormField label={t("field.description")}>
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} />
          </FormField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <FormField label={t("field.weight")}>
              <Input type="number" step="0.001" min="0" value={form.weightKg} onChange={(e) => set("weightKg", e.target.value)} />
            </FormField>
            <FormField label={t("field.dimensions")} hint={t("field.dimensionsHint")}>
              <Input value={form.dimensions} onChange={(e) => set("dimensions", e.target.value)} />
            </FormField>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
            <Button type="submit" disabled={loading}>
              {loading ? t("common.creating") : t("seller.products.create")}
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.push("/products")}>{t("common.cancel")}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
