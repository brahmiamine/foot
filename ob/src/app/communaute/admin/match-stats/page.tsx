import { notFound } from "next/navigation";
import Link from "next/link";
import { getSsoSession } from "@/lib/ssoSession";
import { getObTeam } from "@/lib/ob-team";
import { PublicMatchService } from "@/services/PublicMatchService";
import { MatchStatsService } from "@/services/MatchStatsService";
import { PageChrome } from "@/components/PageChrome";
import { MatchStatsForm, type MatchStatsValues } from "@/components/MatchStatsForm";
import { formatShortDate } from "@/lib/format";
import shared from "@/components/shared.module.css";

export const dynamic = "force-dynamic";

export default async function AdminMatchStatsPage() {
  const session = await getSsoSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    notFound();
  }

  const team = await getObTeam();
  if (!team) notFound();

  const allMatches = await new PublicMatchService().getAllPublic(team.id);
  const relevant = allMatches
    .filter((m) => m.status === "FINISHED" || m.status === "IN_PROGRESS")
    .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))
    .slice(0, 20);

  const statsMap = await new MatchStatsService().getForMatches(relevant.map((m) => m.id));
  const statsByMatch: Record<string, MatchStatsValues> = {};
  for (const [matchId, stats] of statsMap) {
    statsByMatch[matchId] = {
      possessionHome: stats.possessionHome ?? null,
      possessionAway: stats.possessionAway ?? null,
      shotsHome: stats.shotsHome ?? null,
      shotsAway: stats.shotsAway ?? null,
      shotsOnTargetHome: stats.shotsOnTargetHome ?? null,
      shotsOnTargetAway: stats.shotsOnTargetAway ?? null,
      cornersHome: stats.cornersHome ?? null,
      cornersAway: stats.cornersAway ?? null,
      foulsHome: stats.foulsHome ?? null,
      foulsAway: stats.foulsAway ?? null,
    };
  }

  const matches = relevant.map((m) => ({
    id: m.id,
    label: `${m.homeTeam?.nom ?? "?"} vs ${m.awayTeam?.nom ?? "?"}${m.date ? ` — ${formatShortDate(m.date)}` : ""}`,
  }));

  return (
    <PageChrome>
      <div className={shared.sectionPad}>
        <div className={shared.container}>
          <h1 className={shared.sectionTitle} style={{ marginBottom: 8 }}>
            Statistiques de match
          </h1>
          <p style={{ marginBottom: 28 }}>
            <Link href="/communaute/admin/moderation">→ Modération</Link>
            {" · "}
            <Link href="/communaute/admin/sondages">→ Sondages</Link>
          </p>
          <MatchStatsForm matches={matches} statsByMatch={statsByMatch} />
        </div>
      </div>
    </PageChrome>
  );
}
