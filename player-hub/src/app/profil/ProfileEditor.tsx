"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitProfileChangeRequestAction, updateProfileImageAction } from "@/app/actions";
import type { PlayerProfileRequestDto } from "@/lib/clubPlayerProfileClient";

const CATEGORIES = [
  "seniors", "u21", "u20", "u19", "u18", "u17", "u16", "u15", "u14", "u13", "u12", "u11", "u10", "u9", "u8", "u7",
] as const;
const POSITIONS = ["GOALKEEPER", "DEFENDER", "MIDFIELDER", "FORWARD"] as const;

const STATUS_LABEL: Record<PlayerProfileRequestDto["status"], string> = {
  PENDING: "En attente",
  APPROVED: "Approuvée",
  REJECTED: "Refusée",
  STALE: "À renouveler",
  AUTO_APPLIED: "Appliquée automatiquement",
};

interface CurrentProfile {
  imageUrl: string | null;
  firstNameFr: string;
  lastNameFr: string;
  firstNameAr: string | null;
  lastNameAr: string | null;
  birthDate: string | null;
  position: string | null;
  number: number;
  category: string;
}

export function ProfileEditor({ current, requests }: { current: CurrentProfile; requests: PlayerProfileRequestDto[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState(current.imageUrl ?? "");
  const [form, setForm] = useState({
    firstNameFr: current.firstNameFr,
    lastNameFr: current.lastNameFr,
    firstNameAr: current.firstNameAr ?? "",
    lastNameAr: current.lastNameAr ?? "",
    birthDate: current.birthDate ?? "",
    position: current.position ?? "",
    number: String(current.number),
    category: current.category,
  });

  const hasPending = requests.some((request) => request.status === "PENDING");
  const sensitiveChanges = useMemo(() => {
    const changes: Record<string, string | number | null> = {};
    if (form.firstNameFr.trim() !== current.firstNameFr) changes.firstNameFr = form.firstNameFr.trim();
    if (form.lastNameFr.trim() !== current.lastNameFr) changes.lastNameFr = form.lastNameFr.trim();
    if ((form.firstNameAr.trim() || null) !== (current.firstNameAr ?? null)) changes.firstNameAr = form.firstNameAr.trim() || null;
    if ((form.lastNameAr.trim() || null) !== (current.lastNameAr ?? null)) changes.lastNameAr = form.lastNameAr.trim() || null;
    if ((form.birthDate || null) !== (current.birthDate ?? null)) changes.birthDate = form.birthDate || null;
    if ((form.position || null) !== (current.position ?? null)) changes.position = form.position || null;
    const number = Number(form.number);
    if (Number.isInteger(number) && number !== current.number) changes.number = number;
    if (form.category !== current.category) changes.category = form.category;
    return changes;
  }, [current, form]);

  function saveImage() {
    setMessage(null);
    startTransition(async () => {
      try {
        await updateProfileImageAction(imageUrl.trim() || null);
        setMessage("Photo de profil mise à jour.");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Mise à jour impossible");
      }
    });
  }

  function submitSensitive() {
    setMessage(null);
    if (Object.keys(sensitiveChanges).length === 0) {
      setMessage("Aucune modification sensible à soumettre.");
      return;
    }
    startTransition(async () => {
      try {
        await submitProfileChangeRequestAction(sensitiveChanges);
        setMessage("Demande envoyée au club pour validation.");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Demande impossible");
      }
    });
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {message && <div role="status" style={{ padding: 10, border: "1px solid var(--ph-border)", borderRadius: 8 }}>{message}</div>}

      <section style={{ padding: 16, border: "1px solid var(--ph-border)", borderRadius: 12 }}>
        <h2 style={{ fontSize: "1rem", marginTop: 0 }}>Photo de profil</h2>
        <p style={{ color: "var(--ph-text-muted)", fontSize: "0.82rem" }}>Ce champ est appliqué directement.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            placeholder="/uploads/players/photo.jpg ou https://…"
            style={{ flex: "1 1 320px", padding: 9, borderRadius: 8, border: "1px solid var(--ph-border)" }}
          />
          <button type="button" disabled={pending} onClick={saveImage} style={{ padding: "9px 14px", borderRadius: 8, border: 0, fontWeight: 700 }}>
            Enregistrer la photo
          </button>
        </div>
      </section>

      <section style={{ padding: 16, border: "1px solid var(--ph-border)", borderRadius: 12 }}>
        <h2 style={{ fontSize: "1rem", marginTop: 0 }}>Identité sportive</h2>
        <p style={{ color: "var(--ph-text-muted)", fontSize: "0.82rem" }}>
          Ces changements nécessitent l'approbation du club avant d'être appliqués.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
          <label>Prénom (FR)<input value={form.firstNameFr} onChange={(e) => setForm({ ...form, firstNameFr: e.target.value })} style={inputStyle} /></label>
          <label>Nom (FR)<input value={form.lastNameFr} onChange={(e) => setForm({ ...form, lastNameFr: e.target.value })} style={inputStyle} /></label>
          <label>Prénom (AR)<input value={form.firstNameAr} onChange={(e) => setForm({ ...form, firstNameAr: e.target.value })} style={inputStyle} /></label>
          <label>Nom (AR)<input value={form.lastNameAr} onChange={(e) => setForm({ ...form, lastNameAr: e.target.value })} style={inputStyle} /></label>
          <label>Date de naissance<input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} style={inputStyle} /></label>
          <label>Numéro<input type="number" min={0} max={99} value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} style={inputStyle} /></label>
          <label>Poste<select value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} style={inputStyle}><option value="">—</option>{POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
          <label>Catégorie<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={inputStyle}>{CATEGORIES.map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}</select></label>
        </div>
        <button type="button" disabled={pending || hasPending} onClick={submitSensitive} style={{ marginTop: 14, padding: "9px 14px", borderRadius: 8, border: 0, fontWeight: 700 }}>
          {hasPending ? "Une demande est déjà en attente" : "Soumettre au club"}
        </button>
      </section>

      <section style={{ padding: 16, border: "1px solid var(--ph-border)", borderRadius: 12 }}>
        <h2 style={{ fontSize: "1rem", marginTop: 0 }}>Historique des demandes</h2>
        {requests.length === 0 ? <p style={{ color: "var(--ph-text-muted)" }}>Aucune demande.</p> : (
          <div style={{ display: "grid", gap: 8 }}>
            {requests.map((request) => (
              <div key={request.id} style={{ borderTop: "1px solid var(--ph-border)", paddingTop: 8 }}>
                <strong>{STATUS_LABEL[request.status]}</strong>
                <span style={{ marginLeft: 8, color: "var(--ph-text-muted)", fontSize: "0.78rem" }}>{new Date(request.createdAt).toLocaleString("fr-FR")}</span>
                <div style={{ fontSize: "0.82rem", marginTop: 4 }}>{Object.keys(request.requestedChanges).join(", ") || "Photo"}</div>
                {request.reviewReason && <div style={{ fontSize: "0.82rem", color: "var(--ph-text-muted)" }}>Motif : {request.reviewReason}</div>}
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
