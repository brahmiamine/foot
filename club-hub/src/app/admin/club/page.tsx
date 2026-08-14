import { ClubContentService } from "@/services/ClubContentService";
import { requireTeamId } from "@/lib/team-context";
import { ClubInfoForm } from "./ClubInfoForm";

export const dynamic = "force-dynamic";

/** Admin — présentation du club (page publique /club) : qui sommes-nous, valeurs, projet sportif, organisation. */
export default async function ClubPage() {
  const teamId = await requireTeamId();
  const info = await new ClubContentService().getClubInfo(teamId);

  return (
    <div className="container-fluid px-0">
      <h1 className="h4 mb-4">Le club — Présentation</h1>
      <ClubInfoForm
        initialData={{
          presentationFr: info?.presentationFr ?? "",
          presentationAr: info?.presentationAr ?? "",
          valuesFr: info?.valuesFr ?? "",
          valuesAr: info?.valuesAr ?? "",
          sportProjectFr: info?.sportProjectFr ?? "",
          sportProjectAr: info?.sportProjectAr ?? "",
          organizationFr: info?.organizationFr ?? "",
          organizationAr: info?.organizationAr ?? "",
        }}
      />
    </div>
  );
}
