import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserAccess, can } from "@/lib/access";
import { medicalPortalService } from "@/services/MedicalPortalService";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { InjuryEditForm } from "@/components/portal/InjuryEditForm";
import { FollowUpNoteForm } from "@/components/portal/FollowUpNoteForm";
import { AddDocumentForm } from "@/components/portal/AddDocumentForm";
import { MarkResolvedButton } from "@/components/portal/MarkResolvedButton";
import { formatDate } from "@/lib/format";
import type { InjuryDocument } from "@/entities/Injury";

const STATUS_LABEL: Record<string, { label: string; tone: "danger" | "warning" | "success" }> = {
  ONGOING: { label: "En cours", tone: "danger" },
  RECOVERING: { label: "En récupération", tone: "warning" },
  RESOLVED: { label: "Résolue", tone: "success" },
};

function parseDocuments(raw: string | null | undefined): InjuryDocument[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default async function InjuryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return null;
  const access = await getUserAccess();
  if (!can(access, "medical.view")) redirect("/");

  const injury = await medicalPortalService.getInjury(Number(id), session.user.teamId);
  if (!injury) redirect("/blessures");

  const player = (await medicalPortalService.rosterInCategories(session.user.teamId, "ALL")).find((p) => p.id === injury.playerId);
  const documents = parseDocuments(injury.documents);
  const canManage = can(access, "medical.manage");

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div>
          <h1 style={{ fontSize: "1.2rem", margin: "0 0 4px" }}>
            {player ? `${player.firstNameFr} ${player.lastNameFr}` : injury.playerId} — {injury.zone}
          </h1>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Badge label={STATUS_LABEL[injury.status]?.label ?? injury.status} tone={STATUS_LABEL[injury.status]?.tone ?? "danger"} />
            <span style={{ color: "var(--mh-text-muted)", fontSize: "0.82rem" }}>Blessé le {formatDate(injury.injuryDate)}</span>
          </div>
        </div>
        {canManage && injury.status !== "RESOLVED" && <MarkResolvedButton injuryId={injury.id} />}
      </div>

      <Card>
        <div style={{ fontSize: "0.8rem", color: "var(--mh-text-muted)", fontWeight: 600, marginBottom: 10 }}>Dossier médical</div>
        {canManage ? (
          <InjuryEditForm injury={injury} />
        ) : (
          <div style={{ display: "grid", gap: 8, fontSize: "0.9rem" }}>
            <div>
              <strong>Diagnostic :</strong> {injury.diagnosis ?? "—"}
            </div>
            <div>
              <strong>Retour estimé :</strong> {injury.expectedReturnDate ? formatDate(injury.expectedReturnDate) : "—"}
            </div>
            {injury.progressiveReturn && (
              <div>
                <Badge label="Reprise progressive" tone="info" />
                {injury.progressiveReturnNotes && <p style={{ marginTop: 4 }}>{injury.progressiveReturnNotes}</p>}
              </div>
            )}
          </div>
        )}
      </Card>

      <Card>
        <div style={{ fontSize: "0.8rem", color: "var(--mh-text-muted)", fontWeight: 600, marginBottom: 10 }}>Suivi quotidien</div>
        {canManage && <FollowUpNoteForm injuryId={injury.id} />}
        <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: "0.85rem", marginTop: 12, marginBottom: 0 }}>
          {injury.notes || "Aucune note pour l'instant."}
        </pre>
      </Card>

      <Card>
        <div style={{ fontSize: "0.8rem", color: "var(--mh-text-muted)", fontWeight: 600, marginBottom: 10 }}>Documents</div>
        {canManage && <AddDocumentForm injuryId={injury.id} />}
        {documents.length === 0 ? (
          <p style={{ color: "var(--mh-text-muted)", fontSize: "0.85rem", marginTop: 12 }}>Aucun document.</p>
        ) : (
          <ul style={{ marginTop: 12, paddingLeft: "1.2rem" }}>
            {documents.map((doc, idx) => (
              <li key={idx} style={{ fontSize: "0.85rem" }}>
                <a href={doc.url} target="_blank" rel="noreferrer" style={{ color: "var(--mh-primary)" }}>
                  {doc.name}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
