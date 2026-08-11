"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/apiClient";

export default function AccountSettingsPage() {
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
      <h1 style={{ fontSize: "1.3rem", marginBottom: 4 }}>Compte</h1>
      <p style={{ color: "var(--sp-text-muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>Sécurité de votre compte vendeur.</p>

      <Card>
        <form onSubmit={handleSubmit}>
          <h2 style={{ fontSize: "0.95rem", margin: "0 0 1rem" }}>Changer le mot de passe</h2>

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

          <FormField label="Mot de passe actuel" required>
            <Input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </FormField>
          <FormField label="Nouveau mot de passe" required hint="8 caractères minimum">
            <Input type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </FormField>

          <Button type="submit" disabled={loading}>
            {loading ? "Enregistrement…" : "Changer le mot de passe"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
