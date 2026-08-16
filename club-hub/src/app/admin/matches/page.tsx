import { MatchService } from "@/services/MatchService";
import { MatchGalleryService } from "@/services/MatchGalleryService";
import { requireTeamId } from "@/lib/team-context";
import { MatchesList } from "./MatchesList";

/**
 * Admin Matches List Page
 * Lecture seule : les matchs viennent de la table partagée `matches`.
 */
export default async function MatchesPage() {
  const teamId = await requireTeamId();
  const matchService = new MatchService();
  const matchGalleryService = new MatchGalleryService();
  const matchesData = await matchService.findAll(teamId);
  const galleryCounts = await matchGalleryService.countByMatchIds(matchesData.map((match) => match.id));

  const matches = matchesData.map((match) => ({
    id: match.id,
    homeTeam: match.homeTeam ? { id: match.homeTeam.id, nom: match.homeTeam.nom } : null,
    awayTeam: match.awayTeam ? { id: match.awayTeam.id, nom: match.awayTeam.nom } : null,
    isHome: match.equipeHome === teamId,
    date: match.date ? new Date(match.date).toISOString() : null,
    status: match.status,
    scoreHome: match.scoreHome ?? null,
    scoreAway: match.scoreAway ?? null,
    isPublicVisible: match.isPublicVisible,
    galleryCount: galleryCounts.get(match.id) ?? 0,
  }));

  return <MatchesList initialMatches={matches} />;
}
