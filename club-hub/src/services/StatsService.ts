import { getDataSource } from "@/lib/database";
import { Player } from "@/entities/Player";
import { Staff } from "@/entities/Staff";
import { Match } from "@/entities/Match";
import { Card } from "@/entities/Card";
import { Fine } from "@/entities/Fine";
import { Suspension } from "@/entities/Suspension";
import { Product } from "@/entities/Product";
import { Sponsor } from "@/entities/Sponsor";

export interface AdminStats {
  playersCount: number;
  activePlayersCount: number;
  staffCount: number;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  cardsCount: { yellow: number; red: number; doubleYellow: number };
  finesCount: number;
  finesPendingCount: number;
  finesTotalAmount: number;
  activeSuspensionsCount: number;
  productsCount: number;
  activeSponsorsCount: number;
}

/**
 * Service agrégeant les statistiques du tableau de bord admin. Lit les
 * données déjà en base (pas de nouvelle table) via les repositories
 * existants, filtrées par team_id.
 */
export class StatsService {
  async getStats(teamId: string): Promise<AdminStats> {
    const dataSource = await getDataSource();

    const players = await dataSource.getRepository(Player).find({ where: { teamId } });
    const staff = await dataSource.getRepository(Staff).find({ where: { teamId } });
    const matches = await dataSource.getRepository(Match).find({ where: [{ equipeHome: teamId }, { equipeAway: teamId }] });
    const cards = await dataSource
      .getRepository(Card)
      .createQueryBuilder("card")
      .innerJoin("card.player", "player")
      .where("player.teamId = :teamId", { teamId })
      .getMany();
    const fines = await dataSource
      .getRepository(Fine)
      .createQueryBuilder("fine")
      .where("fine.teamId = :teamId", { teamId })
      .getMany();
    const suspensions = await dataSource
      .getRepository(Suspension)
      .createQueryBuilder("suspension")
      .where("suspension.teamId = :teamId", { teamId })
      .getMany();
    const products = await dataSource.getRepository(Product).find({ where: { teamId } });
    const sponsors = await dataSource.getRepository(Sponsor).find({ where: { teamId, isActive: true } });

    const finishedMatches = matches.filter((m) => m.status === "FINISHED" && m.scoreHome !== null && m.scoreAway !== null);
    let wins = 0;
    let draws = 0;
    let losses = 0;
    for (const match of finishedMatches) {
      const isHome = match.equipeHome === teamId;
      const ownScore = isHome ? match.scoreHome! : match.scoreAway!;
      const otherScore = isHome ? match.scoreAway! : match.scoreHome!;
      if (ownScore > otherScore) wins++;
      else if (ownScore === otherScore) draws++;
      else losses++;
    }

    return {
      playersCount: players.length,
      activePlayersCount: players.filter((p) => p.isActive).length,
      staffCount: staff.length,
      matchesPlayed: finishedMatches.length,
      wins,
      draws,
      losses,
      cardsCount: {
        yellow: cards.filter((c) => c.type === "YELLOW").length,
        red: cards.filter((c) => c.type === "RED").length,
        doubleYellow: cards.filter((c) => c.type === "DOUBLE_YELLOW").length,
      },
      finesCount: fines.length,
      finesPendingCount: fines.filter((f) => f.status === "PENDING" || f.status === "OVERDUE").length,
      finesTotalAmount: fines.reduce((sum, f) => sum + Number(f.amount), 0),
      activeSuspensionsCount: suspensions.filter((s) => s.status === "ACTIVE").length,
      productsCount: products.length,
      activeSponsorsCount: sponsors.length,
    };
  }
}
