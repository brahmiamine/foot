"use client";

import { useI18n } from "@/i18n/provider";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/apiClient";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<{ message: string }>("/api/auth/forgot-password", { email });
      setMessage(res.message);
    } catch (err) {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 style={{ margin: "0 0 0.35rem", fontSize: "1.05rem" }}>{t("auth.forgot.title")}</h2>
      <p style={{ margin: "0 0 1.25rem", fontSize: "0.82rem", color: "var(--sp-text-muted)" }}>{t("auth.forgot.description")}</p>

      {message && (
        <div style={{ background: "var(--sp-success-soft)", color: "#166534", padding: "0.6rem 0.8rem", borderRadius: 8, fontSize: "0.82rem", marginBottom: "1rem" }}>
          {message}
        </div>
      )}
      {error && (
        <div style={{ background: "var(--sp-danger-soft)", color: "var(--sp-danger)", padding: "0.6rem 0.8rem", borderRadius: 8, fontSize: "0.82rem", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <FormField label={t("auth.email.label")} required>
        <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
      </FormField>

      <Button type="submit" disabled={loading} style={{ width: "100%" }}>
        {loading ? t("common.sending") : t("auth.forgot.submit")}
      </Button>

      <p style={{ textAlign: "center", fontSize: "0.82rem", color: "var(--sp-text-muted)", marginTop: "1.25rem" }}>
        <Link href="/login" style={{ color: "var(--sp-primary)", fontWeight: 600 }}>{t("auth.forgot.back")}</Link>
      </p>
    </form>
  );
}
