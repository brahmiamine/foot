"use client";

import { useI18n } from "@/i18n/provider";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/apiClient";

interface FormState {
  clubId: string;
  businessName: string;
  ownerName: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  description: string;
  activityCategory: string;
  taxId: string;
  tradeRegister: string;
}

interface ClubOption {
  id: string;
  nom: string;
}

const initialState: FormState = {
  clubId: "",
  businessName: "",
  ownerName: "",
  email: "",
  password: "",
  phone: "",
  address: "",
  city: "",
  country: "Tunisie",
  description: "",
  activityCategory: "",
  taxId: "",
  tradeRegister: "",
};

export default function RegisterPage() {
  const { t } = useI18n();
  const [form, setForm] = useState<FormState>(initialState);
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api
      .get<{ items: ClubOption[] }>("/api/teams?type=club")
      .then((res) => setClubs(res.items))
      .catch(() => setClubs([]));
  }, []);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(form).filter(
          ([key, v]) => key === "clubId" || key === "businessName" || key === "ownerName" || key === "email" || key === "password" || v !== "",
        ),
      );
      await api.post("/api/auth/register", payload);
      setDone(true);
    } catch (err) {
      setError(t("auth.register.error"));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div style={{ textAlign: "center" }}>
        <h2 style={{ fontSize: "1.05rem" }}>{t("auth.register.successTitle")}</h2>
        <p style={{ color: "var(--sp-text-muted)", fontSize: "0.88rem", lineHeight: 1.5 }}>{t("auth.register.successDescription")}</p>
        <Link href="/login">
          <Button style={{ marginTop: "0.75rem" }}>{t("auth.register.toLogin")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 style={{ margin: "0 0 0.35rem", fontSize: "1.05rem" }}>{t("auth.register.title")}</h2>
      <p style={{ margin: "0 0 1.25rem", fontSize: "0.8rem", color: "var(--sp-text-muted)" }}>{t("auth.register.description")}</p>

      {error && (
        <div style={{ background: "var(--sp-danger-soft)", color: "var(--sp-danger)", padding: "0.6rem 0.8rem", borderRadius: 8, fontSize: "0.82rem", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <FormField label={t("auth.register.club")} required hint={t("auth.register.clubHint")}>
        <Select required value={form.clubId} onChange={(e) => set("clubId", e.target.value)}>
          <option value="" disabled>{t("auth.register.clubPlaceholder")}</option>
          {clubs.map((club) => (
            <option key={club.id} value={club.id}>
              {club.nom}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label={t("field.businessName")} required>
        <Input required value={form.businessName} onChange={(e) => set("businessName", e.target.value)} />
      </FormField>
      <FormField label={t("field.ownerName")} required>
        <Input required value={form.ownerName} onChange={(e) => set("ownerName", e.target.value)} />
      </FormField>
      <FormField label={t("auth.email.label")} required>
        <Input type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} />
      </FormField>
      <FormField label={t("auth.password.label")} required hint={t("auth.password.hint")}>
        <Input type="password" required minLength={8} value={form.password} onChange={(e) => set("password", e.target.value)} />
      </FormField>
      <FormField label={t("field.phone")}>
        <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
      </FormField>
      <FormField label={t("field.address")}>
        <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
      </FormField>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <FormField label={t("field.city")}>
          <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
        </FormField>
        <FormField label={t("field.country")}>
          <Input value={form.country} onChange={(e) => set("country", e.target.value)} />
        </FormField>
      </div>
      <FormField label={t("field.activityCategory")} hint={t("field.activityCategoryHint")}>
        <Input value={form.activityCategory} onChange={(e) => set("activityCategory", e.target.value)} />
      </FormField>
      <FormField label={t("field.activityDescription")}>
        <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} />
      </FormField>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <FormField label={t("field.taxId")}>
          <Input value={form.taxId} onChange={(e) => set("taxId", e.target.value)} />
        </FormField>
        <FormField label={t("field.tradeRegister")}>
          <Input value={form.tradeRegister} onChange={(e) => set("tradeRegister", e.target.value)} />
        </FormField>
      </div>

      <Button type="submit" disabled={loading} style={{ width: "100%", marginTop: "0.5rem" }}>
        {loading ? t("common.sending") : t("auth.register.submit")}
      </Button>

      <p style={{ textAlign: "center", fontSize: "0.82rem", color: "var(--sp-text-muted)", marginTop: "1.25rem" }}>
        {t("auth.register.existing")}{" "}
        <Link href="/login" style={{ color: "var(--sp-primary)", fontWeight: 600 }}>{t("auth.login.submit")}</Link>
      </p>
    </form>
  );
}
