import { ClubContentService } from "@/services/ClubContentService";
import { requireTeamId } from "@/lib/team-context";
import { HistoryForm } from "./HistoryForm";

export const dynamic = "force-dynamic";

/** Admin — histoire du club (page publique /club/histoire) : récit + date de création. */
export default async function ClubHistoryPage() {
  const teamId = await requireTeamId();
  const history = await new ClubContentService().getHistory(teamId);

  return (
    <div className="container-fluid px-0">
      <h1 className="h4 mb-4">Le club — Histoire</h1>
      <HistoryForm
        initialData={{
          foundedDate: history?.foundedDate ?? "",
          storyFr: history?.storyFr ?? "",
          storyAr: history?.storyAr ?? "",
        }}
      />
    </div>
  );
}
