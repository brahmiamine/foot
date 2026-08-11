import { getDataSource } from "@/lib/database";
import { MsGoal } from "@/entities/MsGoal";
import { MsSubstitution } from "@/entities/MsSubstitution";
import { MatchCard } from "@/entities/MatchCard";
import { Player } from "@/entities/Player";

export type MatchDayEventType = "GOAL" | "CARD" | "SUB";

export interface MatchDayEvent {
  type: MatchDayEventType;
  minute: number;
  period: string;
  teamId: string;
  label: string;
}

/**
 * Agrège buts/cartons/remplacements (saisis en direct dans matchsheet) en
 * un fil chronologique unique pour l'affichage public "Match Day" (#21).
 */
export class MatchDayService {
  async getEvents(matchId: string): Promise<MatchDayEvent[]> {
    const dataSource = await getDataSource();
    const [goals, cards, subs] = await Promise.all([
      dataSource.getRepository(MsGoal).find({ where: { matchId } }),
      dataSource.getRepository(MatchCard).find({ where: { matchId } }),
      dataSource.getRepository(MsSubstitution).find({ where: { matchId } }),
    ]);

    const playerIds = new Set<string>();
    for (const g of goals) if (g.playerId) playerIds.add(g.playerId);
    for (const c of cards) playerIds.add(c.playerId);
    for (const s of subs) {
      playerIds.add(s.playerOutId);
      playerIds.add(s.playerInId);
    }

    const names = await this.playerNames([...playerIds]);

    const events: MatchDayEvent[] = [];

    for (const g of goals) {
      const player = g.playerId ? (names.get(g.playerId) ?? "Joueur") : "Joueur";
      const suffix = g.isOwnGoal ? " (csc)" : g.isPenalty ? " (penalty)" : "";
      events.push({
        type: "GOAL",
        minute: g.minute,
        period: g.period,
        teamId: g.teamId,
        label: `⚽ But ! ${player}${suffix}`,
      });
    }

    for (const c of cards) {
      if (c.isNeutralized || c.minute == null) continue;
      const player = names.get(c.playerId) ?? "Joueur";
      const icon = c.type === "RED" ? "🟥" : "🟨";
      events.push({
        type: "CARD",
        minute: c.minute,
        period: c.period ?? "H1",
        teamId: "",
        label: `${icon} Carton ${c.type === "RED" ? "rouge" : "jaune"} — ${player}`,
      });
    }

    for (const s of subs) {
      const playerOut = names.get(s.playerOutId) ?? "Joueur";
      const playerIn = names.get(s.playerInId) ?? "Joueur";
      events.push({
        type: "SUB",
        minute: s.minute,
        period: s.period,
        teamId: s.teamId,
        label: `🔄 Remplacement — ${playerIn} entre pour ${playerOut}`,
      });
    }

    return events.sort((a, b) => a.minute - b.minute);
  }

  private async playerNames(playerIds: string[]): Promise<Map<string, string>> {
    if (playerIds.length === 0) return new Map();
    const dataSource = await getDataSource();
    const players = await dataSource.getRepository(Player).find({ where: playerIds.map((id) => ({ id })) });
    return new Map(players.map((p) => [p.id, `${p.firstNameFr} ${p.lastNameFr}`]));
  }
}
