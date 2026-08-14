import { RecruitmentService } from "@/services/RecruitmentService";
import { requireTeamId } from "@/lib/team-context";
import { RecruitmentApplicationsManagement } from "./RecruitmentApplicationsManagement";

export const dynamic = "force-dynamic";

/** Admin — candidatures reçues via /recrutement (détection/recrutement, jeunes et seniors). */
export default async function RecruitmentApplicationsPage() {
  const teamId = await requireTeamId();
  const applications = await new RecruitmentService().findAllApplications(teamId);

  return (
    <div className="container-fluid px-0">
      <h1 className="h4 mb-4">Recrutement — Candidatures</h1>
      <RecruitmentApplicationsManagement
        initialApplications={applications.map((a) => ({
          id: a.id,
          name: a.name,
          birthDate: a.birthDate,
          category: a.category,
          position: a.position,
          currentClub: a.currentClub ?? null,
          parentPhone: a.parentPhone,
          email: a.email ?? null,
          videoUrl: a.videoUrl ?? null,
          message: a.message ?? null,
          status: a.status,
          adminNotes: a.adminNotes ?? null,
          createdAt: a.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
