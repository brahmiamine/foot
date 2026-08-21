"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signConsentAction } from "@/app/actions";
import type { PlayerConsentType } from "@/entities/PlayerConsent";

interface ConsentView {
  id: string;
  consentType: PlayerConsentType;
  referenceId: string | null;
  signedAt: string;
}

const CONSENT_TYPE_LABEL: Record<PlayerConsentType, string> = {
  CONTRACT: "Contrat",
  TRANSFER: "Transfert",
  LICENSE: "Licence",
  IMAGE_RIGHTS: "Droit à l'image",
  REGULATION: "Règlement intérieur",
};

export function ConsentForm({ consents }: { consents: ConsentView[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [consentType, setConsentType] = useState<PlayerConsentType>("REGULATION");

  function submit() {
    setMessage(null);
    startTransition(async () => {
      try {
        await signConsentAction(consentType);
        setMessage("Consentement enregistré.");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Signature impossible");
      }
    });
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {message && <div role="status" style={{ padding: 10, border: "1px solid var(--ph-border)", borderRadius: 8 }}>{message}</div>}

      <section style={{ padding: 16, border: "1px solid var(--ph-border)", borderRadius: 12 }}>
        <h2 style={{ fontSize: "1rem", marginTop: 0 }}>Donner mon consentement</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select value={consentType} onChange={(e) => setConsentType(e.target.value as PlayerConsentType)} style={{ padding: 9, borderRadius: 8, border: "1px solid var(--ph-border)" }}>
            {(Object.keys(CONSENT_TYPE_LABEL) as PlayerConsentType[]).map((type) => (
              <option key={type} value={type}>{CONSENT_TYPE_LABEL[type]}</option>
            ))}
          </select>
          <button type="button" disabled={pending} onClick={submit} style={{ padding: "9px 14px", borderRadius: 8, border: 0, fontWeight: 700 }}>
            Signer
          </button>
        </div>
      </section>

      <section style={{ padding: 16, border: "1px solid var(--ph-border)", borderRadius: 12 }}>
        <h2 style={{ fontSize: "1rem", marginTop: 0 }}>Historique</h2>
        {consents.length === 0 ? <p style={{ color: "var(--ph-text-muted)" }}>Aucun consentement signé.</p> : (
          <div style={{ display: "grid", gap: 8 }}>
            {consents.map((consent) => (
              <div key={consent.id} style={{ borderTop: "1px solid var(--ph-border)", paddingTop: 8 }}>
                <strong>{CONSENT_TYPE_LABEL[consent.consentType]}</strong>
                <span style={{ marginLeft: 8, color: "var(--ph-text-muted)", fontSize: "0.78rem" }}>
                  {new Date(consent.signedAt).toLocaleString("fr-FR")}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
