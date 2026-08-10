import { AcademyService } from "@/services/AcademyService";
import { requireTeamId } from "@/lib/team-context";
import { AcademyInfoForm } from "./AcademyInfoForm";

export const dynamic = "force-dynamic";

/** Admin — contenu éditorial de la formation (philosophie, méthode, encadrement, infrastructures, détection). */
export default async function AcademyInfoPage() {
  const teamId = await requireTeamId();
  const info = await new AcademyService().getInfo(teamId);

  return (
    <div className="container-fluid px-0">
      <h1 className="h4 mb-4">Formation — Contenu éditorial</h1>
      <AcademyInfoForm
        initialData={{
          philosophyFr: info?.philosophyFr ?? "",
          philosophyAr: info?.philosophyAr ?? "",
          methodFr: info?.methodFr ?? "",
          methodAr: info?.methodAr ?? "",
          supervisionFr: info?.supervisionFr ?? "",
          supervisionAr: info?.supervisionAr ?? "",
          infrastructureFr: info?.infrastructureFr ?? "",
          infrastructureAr: info?.infrastructureAr ?? "",
          detectionFr: info?.detectionFr ?? "",
          detectionAr: info?.detectionAr ?? "",
        }}
      />
    </div>
  );
}
