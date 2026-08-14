import { TeamSocialsService } from "@/services/TeamSocialsService";
import { requireTeamId } from "@/lib/team-context";
import { SocialsForm } from "./SocialsForm";

export const dynamic = "force-dynamic";

/** Admin — réseaux sociaux du club (liens affichés en footer/header du site public). */
export default async function ClubSettingsPage() {
  const teamId = await requireTeamId();
  const socials = await new TeamSocialsService().get(teamId);

  return (
    <div className="container-fluid px-0">
      <h1 className="h4 mb-4">Contact &amp; réseaux — Réseaux sociaux</h1>
      <SocialsForm
        initialData={{
          facebookUrl: socials?.facebookUrl ?? "",
          instagramUrl: socials?.instagramUrl ?? "",
          tiktokUrl: socials?.tiktokUrl ?? "",
          youtubeUrl: socials?.youtubeUrl ?? "",
          xUrl: socials?.xUrl ?? "",
        }}
      />
    </div>
  );
}
