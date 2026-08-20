"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { approvePlayerProfileRequest, rejectPlayerProfileRequest } from "./actions";

interface RequestItem {
  id: string;
  playerId: string;
  playerName?: string;
  currentCategory?: string;
  requesterUserId: string;
  requestedChanges: Record<string, unknown>;
  beforeSnapshot: Record<string, unknown>;
  createdAt: string;
}

const LABELS: Record<string, string> = {
  firstNameFr: "Prénom (FR)",
  lastNameFr: "Nom (FR)",
  firstNameAr: "Prénom (AR)",
  lastNameAr: "Nom (AR)",
  birthDate: "Date de naissance",
  position: "Poste",
  number: "Numéro",
  category: "Catégorie",
};

function valueLabel(value: unknown): string {
  if (value == null || value === "") return "—";
  return String(value);
}

export function PlayerProfileRequests({ requests }: { requests: RequestItem[] }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  function approve(id: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await approvePlayerProfileRequest(id);
      if (!result.success) setMessage(result.error ?? "Approbation impossible");
      else if (result.status === "STALE") setMessage("La demande est devenue obsolète et n'a pas été appliquée.");
      else setMessage("Demande approuvée et fiche joueur mise à jour.");
      router.refresh();
    });
  }

  function reject(id: string) {
    const reason = window.prompt("Motif du rejet :")?.trim();
    if (!reason) return;
    setMessage(null);
    startTransition(async () => {
      const result = await rejectPlayerProfileRequest(id, reason);
      setMessage(result.success ? "Demande rejetée." : result.error ?? "Rejet impossible");
      router.refresh();
    });
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.35rem" }}>Demandes de modification de profil</h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-muted, #64748b)", fontSize: "0.85rem" }}>
            Les changements d'identité sportive sont appliqués uniquement après validation du club.
          </p>
        </div>
        <Link href="/admin/players" style={{ fontWeight: 600 }}>Retour aux joueurs</Link>
      </div>

      {message && <div role="status" style={{ padding: 10, border: "1px solid #d1d5db", borderRadius: 8 }}>{message}</div>}

      {requests.length === 0 ? (
        <div style={{ padding: 24, border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff" }}>
          Aucune demande en attente.
        </div>
      ) : requests.map((request) => (
        <section key={request.id} style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff", display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <strong>{request.playerName ?? request.playerId}</strong>
              <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                Catégorie actuelle : {request.currentCategory ?? "—"} · demandée le {new Date(request.createdAt).toLocaleString("fr-FR")}
              </div>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 8 }}>Champ</th>
                  <th style={{ textAlign: "left", padding: 8 }}>Avant</th>
                  <th style={{ textAlign: "left", padding: 8 }}>Demandé</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(request.requestedChanges).map(([field, next]) => (
                  <tr key={field} style={{ borderTop: "1px solid #e5e7eb" }}>
                    <td style={{ padding: 8, fontWeight: 600 }}>{LABELS[field] ?? field}</td>
                    <td style={{ padding: 8 }}>{valueLabel(request.beforeSnapshot[field])}</td>
                    <td style={{ padding: 8 }}>{valueLabel(next)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" disabled={pending} onClick={() => approve(request.id)} style={{ padding: "8px 14px", borderRadius: 8, border: 0, cursor: "pointer", fontWeight: 700 }}>
              Approuver
            </button>
            <button type="button" disabled={pending} onClick={() => reject(request.id)} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #d1d5db", cursor: "pointer", background: "transparent", fontWeight: 600 }}>
              Rejeter
            </button>
          </div>
        </section>
      ))}
    </div>
  );
}
