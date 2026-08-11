"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/apiClient";

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/auth/reset-password", { email, token, password });
      setDone(true);
      setTimeout(() => router.push("/login"), 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Réinitialisation impossible.");
    } finally {
      setLoading(false);
    }
  }

  if (!email || !token) {
    return (
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "var(--sp-danger)", fontWeight: 600 }}>Lien de réinitialisation invalide.</p>
        <Link href="/forgot-password" style={{ color: "var(--sp-primary)", fontWeight: 600 }}>
          Redemander un lien
        </Link>
      </div>
    );
  }

  if (done) {
    return <p style={{ textAlign: "center", color: "var(--sp-success)" }}>Mot de passe mis à jour, redirection…</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 style={{ margin: "0 0 1.25rem", fontSize: "1.05rem" }}>Nouveau mot de passe</h2>

      {error && (
        <div style={{ background: "var(--sp-danger-soft)", color: "var(--sp-danger)", padding: "0.6rem 0.8rem", borderRadius: 8, fontSize: "0.82rem", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <FormField label="Nouveau mot de passe" required hint="8 caractères minimum">
        <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
      </FormField>

      <Button type="submit" disabled={loading} style={{ width: "100%" }}>
        {loading ? "Enregistrement…" : "Réinitialiser le mot de passe"}
      </Button>
    </form>
  );
}
