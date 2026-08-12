"use client";

import { useI18n } from "@/i18n/provider";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/apiClient";

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/auth/login", { email, password });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(t("auth.login.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 style={{ margin: "0 0 1.25rem", fontSize: "1.05rem" }}>{t("auth.login.title")}</h2>

      {error && (
        <div style={{ background: "var(--sp-danger-soft)", color: "var(--sp-danger)", padding: "0.6rem 0.8rem", borderRadius: 8, fontSize: "0.82rem", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <FormField label={t("auth.email.label")} required>
        <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
      </FormField>

      <FormField label={t("auth.password.label")} required>
        <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </FormField>

      <div style={{ textAlign: "right", marginBottom: "1.25rem" }}>
        <Link href="/forgot-password" style={{ fontSize: "0.8rem", color: "var(--sp-primary)", fontWeight: 600 }}>{t("auth.password.forgot")}</Link>
      </div>

      <Button type="submit" disabled={loading} style={{ width: "100%" }}>
        {loading ? t("auth.login.loading") : t("auth.login.submit")}
      </Button>

      <p style={{ textAlign: "center", fontSize: "0.82rem", color: "var(--sp-text-muted)", marginTop: "1.25rem" }}>
        {t("auth.login.noAccount")}{" "}
        <Link href="/register" style={{ color: "var(--sp-primary)", fontWeight: 600 }}>{t("auth.login.createAccount")}</Link>
      </p>
    </form>
  );
}
