import type { Team } from "@/entities/Team";
import type { News } from "@/entities/News";
import type { Match } from "@/entities/Match";
import type { StandingsRow } from "@/services/PublicStandingsService";
import { PublicNewsService } from "@/services/PublicNewsService";
import { PublicMatchService } from "@/services/PublicMatchService";
import { PublicStandingsService } from "@/services/PublicStandingsService";

export interface WeeklyDigest {
  weekLabel: string;
  news: News[];
  results: Match[];
  upcoming: Match[];
  standings: StandingsRow[];
}

const WEEK_FORMATTER = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", timeZone: "Africa/Tunis" });

/**
 * Compose le résumé hebdomadaire "OB News" (#27) à la volée à partir des
 * vraies données (actus, résultats, prochains matchs, classement) — pas de
 * snapshot persistant, donc pas d'archive des semaines passées pour
 * l'instant, seulement "cette semaine".
 */
export class NewsletterDigestService {
  async compose(team: Team): Promise<WeeklyDigest> {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    const [news, results, allMatches, standings] = await Promise.all([
      new PublicNewsService().getLatest(team.id, 5),
      new PublicMatchService().getRecentResults(team.id, 3),
      new PublicMatchService().getAllPublic(team.id),
      new PublicStandingsService().getStandings(team),
    ]);

    const upcoming = allMatches
      .filter((m) => m.status === "UPCOMING")
      .sort((a, b) => (a.date?.getTime() ?? Infinity) - (b.date?.getTime() ?? Infinity))
      .slice(0, 3);

    return {
      weekLabel: `Semaine du ${WEEK_FORMATTER.format(startOfWeek)}`,
      news,
      results,
      upcoming,
      standings: standings.slice(0, 5),
    };
  }
}
