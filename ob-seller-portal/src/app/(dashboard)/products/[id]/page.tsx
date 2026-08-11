"use client";

import { useEffect, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { Table, Thead, Th, Td, Tr } from "@/components/ui/Table";
import { productStatusMeta } from "@/lib/statusLabels";
import { formatCurrency } from "@/lib/format";
import { api, ApiError } from "@/lib/apiClient";

interface Variant {
  id: string;
  sku: string;
  attributes: Record<string, string>;
  price: string | null;
  isActive: boolean;
}

interface ProductDetail {
  id: string;
  name: string;
  sku: string;
  price: string;
  compareAtPrice: string | null;
  description: string | null;
  shortDescription: string | null;
  taxRate: string;
  status: string;
  rejectionReason: string | null;
  isActive: boolean;
  variants: Variant[];
  images: { id: string; url: string }[];
}

const EDITABLE = new Set(["DRAFT", "REJECTED"]);

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const router = useRouter();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", price: "", shortDescription: "", description: "" });
  const [variantForm, setVariantForm] = useState({ attrName: "Taille", attrValue: "", sku: "", price: "", stock: "0" });

  function load() {
    api
      .get<{ product: ProductDetail }>(`/api/products/${id}`)
      .then((res) => {
        setProduct(res.product);
        setForm({
          name: res.product.name,
          price: res.product.price,
          shortDescription: res.product.shortDescription ?? "",
          description: res.product.description ?? "",
        });
        setError(null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erreur de chargement."));
  }

  useEffect(load, [id]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!product) return <LoadingState />;

  const editable = EDITABLE.has(product.status);
  const meta = productStatusMeta[product.status] ?? { label: product.status, tone: "neutral" as const };

  async function saveChanges() {
    setSaving(true);
    setNotice(null);
    try {
      await api.patch(`/api/products/${id}`, {
        name: form.name,
        price: Number(form.price),
        shortDescription: form.shortDescription || null,
        description: form.description || null,
      });
      setNotice("Modifications enregistrées.");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function submitForValidation() {
    setSaving(true);
    try {
      await api.post(`/api/products/${id}/submit`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Soumission impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    await api.post(`/api/products/${id}/toggle-active`);
    load();
  }

  async function addVariant(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post(`/api/products/${id}/variants`, {
        sku: variantForm.sku,
        attributes: { [variantForm.attrName]: variantForm.attrValue },
        price: variantForm.price ? Number(variantForm.price) : undefined,
        initialStock: Number(variantForm.stock || 0),
      });
      setVariantForm({ attrName: "Taille", attrValue: "", sku: "", price: "", stock: "0" });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ajout de la variante impossible.");
    }
  }

  async function removeVariant(variantId: string) {
    if (!confirm("Supprimer cette variante ?")) return;
    await api.delete(`/api/product-variants/${variantId}`);
    load();
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <button onClick={() => router.push("/products")} style={{ background: "none", border: "none", color: "var(--sp-primary)", fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: 12 }}>
        ← Retour aux produits
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: "1.3rem", margin: 0 }}>{product.name}</h1>
        <Badge label={meta.label} tone={meta.tone} />
        <Badge label={product.isActive ? "Actif" : "Inactif"} tone={product.isActive ? "success" : "neutral"} />
      </div>
      <p style={{ color: "var(--sp-text-muted)", fontSize: "0.82rem", marginBottom: "1.25rem" }}>SKU {product.sku}</p>

      {product.status === "REJECTED" && product.rejectionReason && (
        <Card style={{ background: "var(--sp-danger-soft)", borderColor: "#fecaca", marginBottom: "1.25rem" }}>
          <strong style={{ color: "var(--sp-danger)" }}>Produit refusé</strong>
          <p style={{ margin: "6px 0 0", fontSize: "0.85rem" }}>Motif : {product.rejectionReason}</p>
        </Card>
      )}

      {!editable && product.status !== "REJECTED" && (
        <Card style={{ background: "var(--sp-info-soft)", borderColor: "#bfdbfe", marginBottom: "1.25rem" }}>
          <p style={{ margin: 0, fontSize: "0.85rem" }}>
            Ce produit est en cours de modération ({meta.label.toLowerCase()}) et ne peut plus être modifié tant que
            l&rsquo;OB n&rsquo;a pas statué.
          </p>
        </Card>
      )}

      {notice && (
        <div style={{ background: "var(--sp-success-soft)", color: "#166534", padding: "0.6rem 0.8rem", borderRadius: 8, fontSize: "0.82rem", marginBottom: "1rem" }}>
          {notice}
        </div>
      )}

      <Card style={{ marginBottom: "1.25rem" }}>
        <FormField label="Nom du produit" required>
          <Input disabled={!editable} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </FormField>
        <FormField label="Prix (DT)" required>
          <Input type="number" step="0.001" disabled={!editable} value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
        </FormField>
        <FormField label="Description courte">
          <Input disabled={!editable} value={form.shortDescription} onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))} />
        </FormField>
        <FormField label="Description">
          <Textarea disabled={!editable} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </FormField>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {editable && (
            <Button onClick={saveChanges} disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          )}
          {(product.status === "DRAFT" || product.status === "REJECTED") && (
            <Button variant="secondary" onClick={submitForValidation} disabled={saving}>
              Soumettre à validation
            </Button>
          )}
          <Button variant="ghost" onClick={toggleActive}>
            {product.isActive ? "Désactiver la visibilité" : "Activer la visibilité"}
          </Button>
        </div>
      </Card>

      <Card padded={false}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--sp-border)" }}>
          <strong>Variantes</strong>
          <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--sp-text-muted)" }}>Ex: Taille (S/M/L) ou Couleur (Rouge/Bleu).</p>
        </div>

        {product.variants.length > 0 && (
          <Table>
            <Thead>
              <Th>SKU</Th>
              <Th>Attributs</Th>
              <Th>Prix</Th>
              <Th>Statut</Th>
              <Th></Th>
            </Thead>
            <tbody>
              {product.variants.map((v) => (
                <Tr key={v.id}>
                  <Td>{v.sku}</Td>
                  <Td>{Object.entries(v.attributes).map(([k, val]) => `${k}: ${val}`).join(", ")}</Td>
                  <Td>{v.price ? formatCurrency(v.price) : "—"}</Td>
                  <Td>
                    <Badge label={v.isActive ? "Actif" : "Inactif"} tone={v.isActive ? "success" : "neutral"} />
                  </Td>
                  <Td>
                    <button onClick={() => removeVariant(v.id)} style={{ background: "none", border: "none", color: "var(--sp-danger)", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>
                      Supprimer
                    </button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}

        <form onSubmit={addVariant} style={{ padding: "1rem 1.25rem", display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Attribut</label>
            <Input value={variantForm.attrName} onChange={(e) => setVariantForm((f) => ({ ...f, attrName: e.target.value }))} style={{ width: 110 }} placeholder="Taille" />
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Valeur</label>
            <Input required value={variantForm.attrValue} onChange={(e) => setVariantForm((f) => ({ ...f, attrValue: e.target.value }))} style={{ width: 100 }} placeholder="M" />
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: 4 }}>SKU</label>
            <Input required value={variantForm.sku} onChange={(e) => setVariantForm((f) => ({ ...f, sku: e.target.value }))} style={{ width: 140 }} />
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Prix (DT)</label>
            <Input type="number" step="0.001" value={variantForm.price} onChange={(e) => setVariantForm((f) => ({ ...f, price: e.target.value }))} style={{ width: 110 }} placeholder="Hérité" />
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: 4 }}>Stock initial</label>
            <Input type="number" min="0" value={variantForm.stock} onChange={(e) => setVariantForm((f) => ({ ...f, stock: e.target.value }))} style={{ width: 100 }} />
          </div>
          <Button type="submit" variant="secondary">
            + Ajouter
          </Button>
        </form>
      </Card>
    </div>
  );
}
