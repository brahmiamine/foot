"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updatePlayerAdministrativeRequestStatus } from "./actions";

interface RequestItem {
  id: string;
  playerId: string;
  requestType: "ATTESTATION" | "DOCUMENT" | "APPOINTMENT";
  details: string;
  status: "NEW" | "IN_PROGRESS" | "FULFILLED" | "REJECTED";
  staffNote: string | null;
  createdAt: string;
}

const TYPE_LABEL: Record<RequestItem["requestType"], string> = {
  ATTESTATION: "Attestation",
  DOCUMENT: "Document",
  APPOINTMENT: "Rendez-vous",
};

export function AdministrativeRequests({ requests }: { requests: RequestItem[] }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  function update(id: string, status: "IN_PROGRESS" | "FULFILLED" | "REJECTED") {
    const staffNote = window.prompt("Note pour le joueur (optionnel) :")?.trim();
    setMessage(null);
    startTransition(async () => {
      const result = await updatePlayerAdministrativeRequestStatus(id, status, staffNote);
      setMessage(result.success ? "Demande mise à jour." : result.error ?? "Mise à jour impossible");
      router.refresh();
    });
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.35rem" }}>Demandes administratives des joueurs</h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-muted, #64748b)", fontSize: "0.85rem" }}>
            Attestations, documents et rendez-vous demandés depuis l&apos;espace joueur.
          </p>
        </div>
        <Link href="/admin/players" style={{ fontWeight: 600 }}>Retour aux joueurs</Link>
      </div>

      {message && <div role="status" style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 8 }}>{message}</div>}

      {requests.length === 0 ? (
        <div style={{ padding: 24, border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff" }}>
          Aucune demande.
        </div>
      ) : requests.map((request) => (
        <section key={request.id} style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff", display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <strong>{TYPE_LABEL[request.requestType]}</strong>
              <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                Statut : {request.status} · demandée le {new Date(request.createdAt).toLocaleString("fr-FR")}
              </div>
            </div>
          </div>
          <div style={{ fontSize: "0.85rem" }}>{request.details}</div>
          {request.staffNote && <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Note actuelle : {request.staffNote}</div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" disabled={pending} onClick={() => update(request.id, "IN_PROGRESS")} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #d1d5db", cursor: "pointer", background: "transparent", fontWeight: 600 }}>
              Prendre en charge
            </button>
            <button type="button" disabled={pending} onClick={() => update(request.id, "FULFILLED")} style={{ padding: "8px 14px", borderRadius: 8, border: 0, cursor: "pointer", fontWeight: 700 }}>
              Marquer traitée
            </button>
            <button type="button" disabled={pending} onClick={() => update(request.id, "REJECTED")} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #d1d5db", cursor: "pointer", background: "transparent", fontWeight: 600 }}>
              Refuser
            </button>
          </div>
        </section>
      ))}
    </div>
  );
}
