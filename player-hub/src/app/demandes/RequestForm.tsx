"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitAdministrativeRequestAction } from "@/app/actions";
import type { PlayerAdministrativeRequestType, PlayerAdministrativeRequestStatus } from "@/entities/PlayerAdministrativeRequest";

interface RequestView {
  id: string;
  requestType: PlayerAdministrativeRequestType;
  details: string;
  status: PlayerAdministrativeRequestStatus;
  staffNote: string | null;
  createdAt: string;
}

const TYPE_LABEL: Record<PlayerAdministrativeRequestType, string> = {
  ATTESTATION: "Attestation",
  DOCUMENT: "Document",
  APPOINTMENT: "Rendez-vous",
};

const STATUS_LABEL: Record<PlayerAdministrativeRequestStatus, string> = {
  NEW: "Nouvelle",
  IN_PROGRESS: "En cours",
  FULFILLED: "Traitée",
  REJECTED: "Refusée",
};

export function RequestForm({ requests }: { requests: RequestView[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [requestType, setRequestType] = useState<PlayerAdministrativeRequestType>("ATTESTATION");
  const [details, setDetails] = useState("");

  function submit() {
    setMessage(null);
    if (details.trim().length < 3) {
      setMessage("Merci de préciser votre demande.");
      return;
    }
    startTransition(async () => {
      try {
        await submitAdministrativeRequestAction(requestType, details);
        setMessage("Demande envoyée au club.");
        setDetails("");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Envoi impossible");
      }
    });
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {message && <div role="status" style={{ padding: 10, border: "1px solid var(--ph-border)", borderRadius: 8 }}>{message}</div>}

      <section style={{ padding: 16, border: "1px solid var(--ph-border)", borderRadius: 12 }}>
        <h2 style={{ fontSize: "1rem", marginTop: 0 }}>Nouvelle demande</h2>
        <div style={{ display: "grid", gap: 10 }}>
          <select value={requestType} onChange={(e) => setRequestType(e.target.value as PlayerAdministrativeRequestType)} style={{ padding: 9, borderRadius: 8, border: "1px solid var(--ph-border)" }}>
            {(Object.keys(TYPE_LABEL) as PlayerAdministrativeRequestType[]).map((type) => (
              <option key={type} value={type}>{TYPE_LABEL[type]}</option>
            ))}
          </select>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Précisez votre demande..."
            rows={3}
            style={{ padding: 9, borderRadius: 8, border: "1px solid var(--ph-border)", resize: "vertical" }}
          />
          <button type="button" disabled={pending} onClick={submit} style={{ padding: "9px 14px", borderRadius: 8, border: 0, fontWeight: 700, justifySelf: "start" }}>
            Envoyer
          </button>
        </div>
      </section>

      <section style={{ padding: 16, border: "1px solid var(--ph-border)", borderRadius: 12 }}>
        <h2 style={{ fontSize: "1rem", marginTop: 0 }}>Suivi</h2>
        {requests.length === 0 ? <p style={{ color: "var(--ph-text-muted)" }}>Aucune demande.</p> : (
          <div style={{ display: "grid", gap: 8 }}>
            {requests.map((request) => (
              <div key={request.id} style={{ borderTop: "1px solid var(--ph-border)", paddingTop: 8 }}>
                <strong>{TYPE_LABEL[request.requestType]}</strong>
                <span style={{ marginLeft: 8, color: "var(--ph-text-muted)", fontSize: "0.78rem" }}>{STATUS_LABEL[request.status]}</span>
                <div style={{ fontSize: "0.82rem", marginTop: 4 }}>{request.details}</div>
                {request.staffNote && <div style={{ fontSize: "0.82rem", color: "var(--ph-text-muted)" }}>Réponse du club : {request.staffNote}</div>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
