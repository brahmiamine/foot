"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { declareAvailabilityAction, cancelAvailabilityDeclarationAction } from "@/app/actions";
import type { PlayerAvailabilityStatus } from "@/entities/PlayerAvailabilityDeclaration";

interface DeclarationView {
  id: number;
  status: PlayerAvailabilityStatus;
  startDate: string;
  endDate: string;
  reason: string | null;
  cancelledAt: string | null;
}

const STATUS_LABEL: Record<PlayerAvailabilityStatus, string> = {
  AVAILABLE: "✅ Disponible",
  UNAVAILABLE: "🚫 Indisponible",
  LIMITED: "⚠️ Limité",
};

export function AvailabilityDeclarationForm({ declarations }: { declarations: DeclarationView[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState<{ status: PlayerAvailabilityStatus; startDate: string; endDate: string; reason: string }>({
    status: "UNAVAILABLE",
    startDate: "",
    endDate: "",
    reason: "",
  });

  function submit() {
    setMessage(null);
    if (!form.startDate || !form.endDate) {
      setMessage("Merci de renseigner une période.");
      return;
    }
    startTransition(async () => {
      try {
        await declareAvailabilityAction({
          status: form.status,
          startDate: form.startDate,
          endDate: form.endDate,
          reason: form.reason.trim() || null,
        });
        setMessage("Déclaration enregistrée.");
        setForm({ status: "UNAVAILABLE", startDate: "", endDate: "", reason: "" });
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Déclaration impossible");
      }
    });
  }

  function cancel(id: number) {
    setMessage(null);
    startTransition(async () => {
      try {
        await cancelAvailabilityDeclarationAction(id);
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Annulation impossible");
      }
    });
  }

  const active = declarations.filter((d) => !d.cancelledAt);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {message && <div role="status" style={{ padding: 10, border: "1px solid var(--ph-border)", borderRadius: 8 }}>{message}</div>}

      <section style={{ padding: 16, border: "1px solid var(--ph-border)", borderRadius: 12 }}>
        <h2 style={{ fontSize: "1rem", marginTop: 0 }}>Déclarer une période</h2>
        <p style={{ color: "var(--ph-text-muted)", fontSize: "0.82rem" }}>
          Informez le staff de votre disponibilité pour une période à venir.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <label>
            Statut
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PlayerAvailabilityStatus })} style={inputStyle}>
              <option value="UNAVAILABLE">Indisponible</option>
              <option value="LIMITED">Limité</option>
              <option value="AVAILABLE">Disponible</option>
            </select>
          </label>
          <label>
            Du
            <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} style={inputStyle} />
          </label>
          <label>
            Au
            <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} style={inputStyle} />
          </label>
        </div>
        <label style={{ display: "block", marginTop: 10 }}>
          Motif (optionnel)
          <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} style={inputStyle} />
        </label>
        <button type="button" disabled={pending} onClick={submit} style={{ marginTop: 14, padding: "9px 14px", borderRadius: 8, border: 0, fontWeight: 700 }}>
          Envoyer
        </button>
      </section>

      <section style={{ padding: 16, border: "1px solid var(--ph-border)", borderRadius: 12 }}>
        <h2 style={{ fontSize: "1rem", marginTop: 0 }}>Mes déclarations</h2>
        {active.length === 0 ? <p style={{ color: "var(--ph-text-muted)" }}>Aucune déclaration active.</p> : (
          <div style={{ display: "grid", gap: 8 }}>
            {active.map((declaration) => (
              <div key={declaration.id} style={{ borderTop: "1px solid var(--ph-border)", paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <strong>{STATUS_LABEL[declaration.status]}</strong>
                  <span style={{ marginLeft: 8, color: "var(--ph-text-muted)", fontSize: "0.82rem" }}>
                    {new Date(declaration.startDate).toLocaleDateString("fr-FR")} → {new Date(declaration.endDate).toLocaleDateString("fr-FR")}
                  </span>
                  {declaration.reason && <div style={{ fontSize: "0.8rem", color: "var(--ph-text-muted)" }}>{declaration.reason}</div>}
                </div>
                <button type="button" disabled={pending} onClick={() => cancel(declaration.id)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--ph-border)", background: "transparent" }}>
                  Annuler
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const inputStyle = {
  display: "block",
  width: "100%",
  marginTop: 4,
  padding: 9,
  borderRadius: 8,
  border: "1px solid var(--ph-border)",
} as const;
