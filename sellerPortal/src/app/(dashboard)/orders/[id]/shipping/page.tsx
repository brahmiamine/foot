"use client";

import { useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/apiClient";

export default function ShippingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const router = useRouter();
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post(`/api/orders/${id}/shipping`, { carrier, trackingNumber });
      router.push(`/orders/${id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible d'enregistrer l'expédition.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <h1 style={{ fontSize: "1.3rem", marginBottom: 4 }}>Expédier la commande</h1>
      <p style={{ color: "var(--sp-text-muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
        Renseignez le transporteur et le numéro de suivi. La commande passera au statut « Expédiée ».
      </p>

      <Card>
        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{ background: "var(--sp-danger-soft)", color: "var(--sp-danger)", padding: "0.6rem 0.8rem", borderRadius: 8, fontSize: "0.82rem", marginBottom: "1rem" }}>
              {error}
            </div>
          )}

          <FormField label="Transporteur" required>
            <Input required value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Ex: Aramex, Rapide Poste…" />
          </FormField>
          <FormField label="Numéro de suivi" required>
            <Input required value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
          </FormField>

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
            <Button type="submit" disabled={loading}>
              {loading ? "Enregistrement…" : "Marquer comme expédiée"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Annuler
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
