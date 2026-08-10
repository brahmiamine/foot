import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, can } from "@/lib/access";
import { DocumentService } from "@/services/DocumentService";
import { ExpirationService } from "@/services/ExpirationService";
import { PlayerService } from "@/services/PlayerService";
import { StaffService } from "@/services/StaffService";
import { DocumentsManagement } from "./DocumentsManagement";

export const dynamic = "force-dynamic";

/**
 * Page Documents & échéances — documents génériques (identité, médical,
 * assurance, autorisation parentale...) attachés à un joueur ou un membre
 * du staff, avec un tableau de bord d'échéances agrégeant aussi les
 * licences (`cms_licenses`).
 */
export default async function DocumentsPage() {
  const teamId = await requireTeamId();
  const access = await getUserAccess();

  const documentService = new DocumentService();
  const expirationService = new ExpirationService();
  const playerService = new PlayerService();
  const staffService = new StaffService();

  const [documentsData, expiring, playersData, staffData] = await Promise.all([
    documentService.findAll(teamId),
    expirationService.getExpiringItems(teamId, 60),
    playerService.findAll(teamId, access.categories),
    staffService.findAll(teamId, access.categories),
  ]);

  const playerLabels = new Map(playersData.map((p) => [p.id, `${p.firstNameFr} ${p.lastNameFr}`]));
  const staffLabels = new Map(staffData.map((s) => [String(s.id), `${s.firstNameFr} ${s.lastNameFr}`]));

  function entityLabel(entityType: string, entityId: string): string {
    if (entityType === "PLAYER") return playerLabels.get(entityId) ?? `Joueur #${entityId}`;
    if (entityType === "STAFF") return staffLabels.get(entityId) ?? `Staff #${entityId}`;
    return `${entityType} #${entityId}`;
  }

  const documents = documentsData.map((d) => ({
    id: d.id,
    entityType: d.entityType,
    entityId: d.entityId,
    entityLabel: entityLabel(d.entityType, d.entityId),
    category: d.category,
    title: d.title,
    fileUrl: d.fileUrl,
    issuedAt: d.issuedAt ?? null,
    expiresAt: d.expiresAt ?? null,
    notes: d.notes ?? null,
  }));

  const players = playersData.map((p) => ({ id: p.id, label: `${p.firstNameFr} ${p.lastNameFr}` }));
  const staff = staffData.map((s) => ({ id: String(s.id), label: `${s.firstNameFr} ${s.lastNameFr}` }));

  return (
    <DocumentsManagement
      initialDocuments={documents}
      expiringItems={expiring}
      players={players}
      staff={staff}
      canManage={can(access, "documents.manage")}
    />
  );
}
