import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserAccess, can } from "@/lib/access";
import { medicalPortalService } from "@/services/MedicalPortalService";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { InjuryEditForm } from "@/components/portal/InjuryEditForm";
import { FollowUpNoteForm } from "@/components/portal/FollowUpNoteForm";
import { AddDocumentForm } from "@/components/portal/AddDocumentForm";
import { ReturnToPlayPanel } from "@/components/portal/ReturnToPlayPanel";
import { formatDate } from "@/lib/format";
import type { InjuryDocument } from "@/entities/Injury";
import {
  countLatestClearances,
  requiredClearances,
} from "@/services/medical/returnToPlayPolicy";

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

  const injuryId = Number(id);
  const injury = await medicalPortalService.getInjury(injuryId, session.user.teamId);
  if (!injury) redirect("/blessures");

  const [roster, followUps, clearances, settings] = await Promise.all([
    medicalPortalService.rosterInCategories(session.user.teamId, access.categories),
    medicalPortalService.listFollowUps(injuryId, session.user.teamId),
    medicalPortalService.listClearances(injuryId, session.user.teamId),
    medicalPortalService.getSettings(session.user.teamId),
  ]);
  const player = roster.find((item) => item.id === injury.playerId);
  // Category scope is enforced on the detail route too; knowing an injury id
  // must not allow a medical staff member to escape their assigned category.
  if (!player) redirect("/blessures");

  const documents = parseDocuments(injury.documents);
  const canEditInjury = can(access, "medical.injuries.manage");
  const canManageFollowUps = can(access, "medical.followups.manage");
  const canManageRtp = can(access, "medical.rtp.manage");
  const canManageClearance = can(access, "medical.clearance.manage");
  const canManageDocuments = can(access, "medical.documents.manage");
  const neededClearances = requiredClearances(injury.severity, settings);
  const currentClearances = countLatestClearances(clearances);

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div>
          <h1 style={{ fontSize: "1.2rem", margin: "0 0 4px" }}>
            {`${player.firstNameFr} ${player.lastNameFr}`} — {injury.zone}
          </h1>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Badge label={STATUS_LABEL[injury.status]?.label ?? injury.status} tone={STATUS_LABEL[injury.status]?.tone ?? "danger"} />
            <span style={{ color: "var(--mh-text-muted)", fontSize: "0.82rem" }}>Blessé le {formatDate(injury.injuryDate)}</span>
          </div>
        </div>
      </div>

      <Card>
        <div style={{ fontSize: "0.8rem", color: "var(--mh-text-muted)", fontWeight: 600, marginBottom: 10 }}>
          Return-to-Play
        </div>
        <ReturnToPlayPanel
          injuryId={injury.id}
          stage={injury.rtpStage}
          clearanceRequired={settings.clearanceRequired}
          requiredClearances={neededClearances}
          currentClearances={currentClearances}
          canTransition={canManageRtp}
          canClearance={canManageClearance}
        />
      </Card>

      <Card>
        <div style={{ fontSize: "0.8rem", color: "var(--mh-text-muted)", fontWeight: 600, marginBottom: 10 }}>Dossier médical</div>
        {canEditInjury ? (
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
        <div style={{ fontSize: "0.8rem", color: "var(--mh-text-muted)", fontWeight: 600, marginBottom: 10 }}>
          Journal médical append-only
        </div>
        {canManageFollowUps && <FollowUpNoteForm injuryId={injury.id} />}
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {followUps.length === 0 && !injury.notes ? (
            <p style={{ color: "var(--mh-text-muted)", fontSize: "0.85rem", margin: 0 }}>Aucune entrée de suivi.</p>
          ) : (
            followUps.map((entry) => (
              <div key={entry.id} style={{ borderTop: "1px solid var(--mh-border)", paddingTop: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <strong style={{ fontSize: "0.8rem" }}>{entry.entryType}</strong>
                  <span style={{ color: "var(--mh-text-muted)", fontSize: "0.76rem" }}>
                    {entry.createdAt.toLocaleString("fr-FR")} · {entry.authorUserId}
                  </span>
                </div>
                <div style={{ fontSize: "0.86rem", marginTop: 4 }}>{entry.note}</div>
              </div>
            ))
          )}
          {injury.notes && (
            <details>
              <summary style={{ cursor: "pointer", fontSize: "0.8rem", color: "var(--mh-text-muted)" }}>
                Notes historiques legacy
              </summary>
              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: "0.82rem" }}>{injury.notes}</pre>
            </details>
          )}
        </div>
      </Card>

      <Card>
        <div style={{ fontSize: "0.8rem", color: "var(--mh-text-muted)", fontWeight: 600, marginBottom: 10 }}>Documents</div>
        {canManageDocuments && <AddDocumentForm injuryId={injury.id} />}
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
