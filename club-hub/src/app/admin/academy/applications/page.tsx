import { can, getUserAccess, requirePermission } from "@/lib/access";
import { PlayerApplicationService, normalizeAcademyCategory } from "@/services/PlayerApplicationService";
import { ApplicationsManagement } from "./ApplicationsManagement";

export const dynamic = "force-dynamic";

/** Admin — candidatures "Inscrire mon enfant" reçues via /inscription. */
export default async function PlayerApplicationsPage() {
  const access = await getUserAccess();
  requirePermission(access, "playerApplications.view");

  const applications = await new PlayerApplicationService().findAll(access.teamId);
  const scopedApplications = applications.filter((application) => {
    if (access.categories === "ALL") return true;
    const category = normalizeAcademyCategory(application.category);
    return category ? access.categories.includes(category) : false;
  });

  return (
    <div className="container-fluid px-0">
      <h1 className="h4 mb-4">Formation — Candidatures d&apos;inscription</h1>
      <ApplicationsManagement
        canManage={can(access, "playerApplications.manage")}
        canCreatePlayer={can(access, "playerApplications.manage") && can(access, "players.create")}
        initialApplications={scopedApplications.map((a) => ({
          id: a.id,
          childLastName: a.childLastName,
          childFirstName: a.childFirstName,
          birthDate: a.birthDate,
          category: a.category,
          suggestedPlayerCategory: normalizeAcademyCategory(a.category),
          position: a.position ?? null,
          parentName: a.parentName,
          parentPhone: a.parentPhone,
          parentEmail: a.parentEmail,
          message: a.message ?? null,
          documentUrl: a.documentUrl ?? null,
          status: a.status,
          adminNotes: a.adminNotes ?? null,
          preScreeningNotes: a.preScreeningNotes ?? null,
          preScreenedAt: a.preScreenedAt?.toISOString() ?? null,
          trialScheduledAt: a.trialScheduledAt?.toISOString() ?? null,
          trialLocation: a.trialLocation ?? null,
          trialNotes: a.trialNotes ?? null,
          technicalApprovedAt: a.technicalApprovedAt?.toISOString() ?? null,
          technicalNotes: a.technicalNotes ?? null,
          administrativeApprovedAt: a.administrativeApprovedAt?.toISOString() ?? null,
          administrativeNotes: a.administrativeNotes ?? null,
          rejectedAt: a.rejectedAt?.toISOString() ?? null,
          rejectionReason: a.rejectionReason ?? null,
          playerId: a.playerId ?? null,
          playerCreatedAt: a.playerCreatedAt?.toISOString() ?? null,
          createdAt: a.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
