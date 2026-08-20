import { can, getUserAccess, requirePermission } from "@/lib/access";
import { requireTeamId } from "@/lib/team-context";
import { RecruitmentService } from "@/services/RecruitmentService";
import { RecruitmentApplicationsManagement } from "./RecruitmentApplicationsManagement";

export const dynamic = "force-dynamic";

/** Admin — candidatures reçues via /recrutement (détection/recrutement, jeunes et seniors). */
export default async function RecruitmentApplicationsPage() {
  const access = await getUserAccess();
  requirePermission(access, "recruitment.view");
  const teamId = await requireTeamId();
  if (access.teamId !== teamId) throw new Error("Action non autorisée : contexte club incohérent");

  const applications = await new RecruitmentService().findAllApplications(teamId);

  return (
    <div className="container-fluid px-0">
      <h1 className="h4 mb-4">Recrutement — Candidatures</h1>
      <RecruitmentApplicationsManagement
        canManage={can(access, "recruitment.manage")}
        initialApplications={applications.map((application) => ({
          id: application.id,
          name: application.name,
          birthDate: application.birthDate,
          category: application.category,
          position: application.position,
          currentClub: application.currentClub ?? null,
          parentPhone: application.parentPhone,
          email: application.email ?? null,
          videoUrl: application.videoUrl ?? null,
          message: application.message ?? null,
          status: application.status,
          adminNotes: application.adminNotes ?? null,
          scoutReviewedAt: application.scoutReviewedAt?.toISOString() ?? null,
          scoutNotes: application.scoutNotes ?? null,
          coachReviewedAt: application.coachReviewedAt?.toISOString() ?? null,
          coachNotes: application.coachNotes ?? null,
          trialScheduledAt: application.trialScheduledAt?.toISOString() ?? null,
          trialLocation: application.trialLocation ?? null,
          trialNotes: application.trialNotes ?? null,
          trialApprovedAt: application.trialApprovedAt?.toISOString() ?? null,
          trialEvaluation: application.trialEvaluation ?? null,
          sportingDirectorApprovedAt: application.sportingDirectorApprovedAt?.toISOString() ?? null,
          sportingDirectorNotes: application.sportingDirectorNotes ?? null,
          negotiationStartedAt: application.negotiationStartedAt?.toISOString() ?? null,
          negotiationNotes: application.negotiationNotes ?? null,
          acceptedAt: application.acceptedAt?.toISOString() ?? null,
          acceptanceNotes: application.acceptanceNotes ?? null,
          rejectedAt: application.rejectedAt?.toISOString() ?? null,
          rejectionReason: application.rejectionReason ?? null,
          createdAt: application.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
