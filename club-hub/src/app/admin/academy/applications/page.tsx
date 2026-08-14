import { PlayerApplicationService } from "@/services/PlayerApplicationService";
import { requireTeamId } from "@/lib/team-context";
import { ApplicationsManagement } from "./ApplicationsManagement";

export const dynamic = "force-dynamic";

/** Admin — candidatures "Inscrire mon enfant" reçues via /inscription. */
export default async function PlayerApplicationsPage() {
  const teamId = await requireTeamId();
  const applications = await new PlayerApplicationService().findAll(teamId);

  return (
    <div className="container-fluid px-0">
      <h1 className="h4 mb-4">Formation — Candidatures d&apos;inscription</h1>
      <ApplicationsManagement
        initialApplications={applications.map((a) => ({
          id: a.id,
          childLastName: a.childLastName,
          childFirstName: a.childFirstName,
          birthDate: a.birthDate,
          category: a.category,
          position: a.position ?? null,
          parentName: a.parentName,
          parentPhone: a.parentPhone,
          parentEmail: a.parentEmail,
          message: a.message ?? null,
          documentUrl: a.documentUrl ?? null,
          status: a.status,
          adminNotes: a.adminNotes ?? null,
          createdAt: a.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
