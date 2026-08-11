"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { sellerStatusMeta } from "@/lib/statusLabels";
import { api, ApiError } from "@/lib/apiClient";

interface Seller {
  businessName: string;
  status: string;
  logoUrl: string | null;
  description: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  taxId: string | null;
  tradeRegister: string | null;
}

export default function SellerProfilePage() {
  const [seller, setSeller] = useState<Seller | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  function load() {
    api
      .get<{ seller: Seller }>("/api/sellers/me")
      .then((res) => {
        setSeller(res.seller);
        setError(null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erreur de chargement."));
  }

  useEffect(load, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!seller) return <LoadingState />;

  function set<K extends keyof Seller>(key: K, value: Seller[K]) {
    setSeller((s) => (s ? { ...s, [key]: value } : s));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!seller) return;
    setSaving(true);
    setNotice(null);
    try {
      await api.patch("/api/sellers/me", {
        businessName: seller.businessName,
        logoUrl: seller.logoUrl,
        description: seller.description,
        phone: seller.phone,
        address: seller.address,
        city: seller.city,
        country: seller.country,
        taxId: seller.taxId,
        tradeRegister: seller.tradeRegister,
      });
      setNotice("Profil mis à jour.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  const statusMeta = sellerStatusMeta[seller.status] ?? { label: seller.status, tone: "neutral" as const };

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <h1 style={{ fontSize: "1.3rem", margin: 0 }}>Profil vendeur</h1>
        <Badge label={statusMeta.label} tone={statusMeta.tone} />
      </div>
      <p style={{ color: "var(--sp-text-muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
        Le statut et la commission sont gérés par l&rsquo;administration du club.
      </p>

      {notice && (
        <div style={{ background: "var(--sp-success-soft)", color: "#166534", padding: "0.6rem 0.8rem", borderRadius: 8, fontSize: "0.82rem", marginBottom: "1rem" }}>
          {notice}
        </div>
      )}

      <Card>
        <form onSubmit={save}>
          <FormField label="Nom commercial" required>
            <Input required value={seller.businessName} onChange={(e) => set("businessName", e.target.value)} />
          </FormField>
          <FormField label="Logo (URL)">
            <Input value={seller.logoUrl ?? ""} onChange={(e) => set("logoUrl", e.target.value)} />
          </FormField>
          <FormField label="Description">
            <Textarea value={seller.description ?? ""} onChange={(e) => set("description", e.target.value)} />
          </FormField>
          <FormField label="Email">
            <Input disabled value={seller.email} />
          </FormField>
          <FormField label="Téléphone">
            <Input value={seller.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
          </FormField>
          <FormField label="Adresse">
            <Input value={seller.address ?? ""} onChange={(e) => set("address", e.target.value)} />
          </FormField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <FormField label="Ville">
              <Input value={seller.city ?? ""} onChange={(e) => set("city", e.target.value)} />
            </FormField>
            <FormField label="Pays">
              <Input value={seller.country ?? ""} onChange={(e) => set("country", e.target.value)} />
            </FormField>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <FormField label="Identifiant fiscal">
              <Input value={seller.taxId ?? ""} onChange={(e) => set("taxId", e.target.value)} />
            </FormField>
            <FormField label="Registre de commerce">
              <Input value={seller.tradeRegister ?? ""} onChange={(e) => set("tradeRegister", e.target.value)} />
            </FormField>
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
