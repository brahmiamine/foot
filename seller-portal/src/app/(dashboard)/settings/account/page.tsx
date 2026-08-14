"use client";

import { useI18n } from "@/i18n/provider";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/apiClient";

export default function AccountSettingsPage() {
  const { t } = useI18n();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const res = await api.post<{ message: string }>("/api/auth/change-password", { currentPassword, newPassword });
      setNotice(res.message);
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Changement impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <h1 style={{ fontSize: "1.3rem", marginBottom: 4 }}>{t("seller.account.title")}</h1>
      <p style={{ color: "var(--sp-text-muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>{t("seller.account.description")}</p>

      <Card>
        <form onSubmit={handleSubmit}>
          <h2 style={{ fontSize: "0.95rem", margin: "0 0 1rem" }}>{t("seller.account.changePassword")}</h2>

          {notice && (
            <div style={{ background: "var(--sp-success-soft)", color: "#166534", padding: "0.6rem 0.8rem", borderRadius: 8, fontSize: "0.82rem", marginBottom: "1rem" }}>
              {notice}
            </div>
          )}
          {error && (
            <div style={{ background: "var(--sp-danger-soft)", color: "var(--sp-danger)", padding: "0.6rem 0.8rem", borderRadius: 8, fontSize: "0.82rem", marginBottom: "1rem" }}>
              {error}
            </div>
          )}

          <FormField label={t("field.currentPassword")} required>
            <Input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </FormField>
          <FormField label={t("field.newPassword")} required hint={t("auth.password.hint")}>
            <Input type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </FormField>

          <Button type="submit" disabled={loading}>
            {loading ? t("common.saving") : t("seller.account.changePassword")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
