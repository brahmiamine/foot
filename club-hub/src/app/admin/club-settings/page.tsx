import Link from "next/link";
import { TeamSocialsService } from "@/services/TeamSocialsService";
import { requireTeamId } from "@/lib/team-context";
import { SocialsForm } from "./SocialsForm";

export const dynamic = "force-dynamic";

/** Admin — paramètres généraux et accès aux centres de gouvernance du club. */
export default async function ClubSettingsPage() {
  const teamId = await requireTeamId();
  const socials = await new TeamSocialsService().get(teamId);

  return (
    <div className="container-fluid px-0">
      <div className="d-flex flex-wrap gap-2 mb-4">
        <Link className="btn btn-outline-primary btn-sm" href="/admin/club-settings/governance">
          Gouvernance & approbations
        </Link>
        <Link className="btn btn-outline-primary btn-sm" href="/admin/club-settings/features">
          Fonctionnalités du club
        </Link>
        <Link className="btn btn-outline-primary btn-sm" href="/admin/club-settings/member-registration">
          Inscriptions membres
        </Link>
      </div>
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
