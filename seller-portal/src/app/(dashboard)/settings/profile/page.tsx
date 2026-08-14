"use client";

import { useI18n } from "@/i18n/provider";
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
  const { t } = useI18n();
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
      .catch((err) => setError(t("error.load")));
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
      setNotice(t("seller.profile.updated"));
    } catch (err) {
      setError(t("error.save"));
    } finally {
      setSaving(false);
    }
  }

  const statusMeta = sellerStatusMeta[seller.status];
  const statusMetaLabel = statusMeta ? t(statusMeta.key) : seller.status;

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <h1 style={{ fontSize: "1.3rem", margin: 0 }}>{t("seller.profile.title")}</h1>
        <Badge label={statusMetaLabel} tone={statusMeta?.tone} />
      </div>
      <p style={{ color: "var(--sp-text-muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>{t("seller.profile.description")}</p>

      {notice && (
        <div style={{ background: "var(--sp-success-soft)", color: "#166534", padding: "0.6rem 0.8rem", borderRadius: 8, fontSize: "0.82rem", marginBottom: "1rem" }}>
          {notice}
        </div>
      )}

      <Card>
        <form onSubmit={save}>
          <FormField label={t("field.businessDisplayName")} required>
            <Input required value={seller.businessName} onChange={(e) => set("businessName", e.target.value)} />
          </FormField>
          <FormField label={t("field.logoUrl")}>
            <Input value={seller.logoUrl ?? ""} onChange={(e) => set("logoUrl", e.target.value)} />
          </FormField>
          <FormField label={t("field.description")}>
            <Textarea value={seller.description ?? ""} onChange={(e) => set("description", e.target.value)} />
          </FormField>
          <FormField label={t("auth.email.label")}>
            <Input disabled value={seller.email} />
          </FormField>
          <FormField label={t("field.phone")}>
            <Input value={seller.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
          </FormField>
          <FormField label={t("field.address")}>
            <Input value={seller.address ?? ""} onChange={(e) => set("address", e.target.value)} />
          </FormField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <FormField label={t("field.city")}>
              <Input value={seller.city ?? ""} onChange={(e) => set("city", e.target.value)} />
            </FormField>
            <FormField label={t("field.country")}>
              <Input value={seller.country ?? ""} onChange={(e) => set("country", e.target.value)} />
            </FormField>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <FormField label={t("field.taxId")}>
              <Input value={seller.taxId ?? ""} onChange={(e) => set("taxId", e.target.value)} />
            </FormField>
            <FormField label={t("field.tradeRegister")}>
              <Input value={seller.tradeRegister ?? ""} onChange={(e) => set("tradeRegister", e.target.value)} />
            </FormField>
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? t("common.saving") : t("common.save")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
