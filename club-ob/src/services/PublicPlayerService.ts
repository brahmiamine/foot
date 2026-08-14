import { getDataSource } from "@/lib/database";
import { Player } from "@/entities/Player";

export type SquadGroup = { label: string; players: Player[] };

const POSITION_LABELS: Record<string, string> = {
  GOALKEEPER: "Gardiens",
  DEFENDER: "Défenseurs",
  MIDFIELDER: "Milieux",
  FORWARD: "Attaquants",
};
const POSITION_ORDER = ["GOALKEEPER", "DEFENDER", "MIDFIELDER", "FORWARD"];

export class PublicPlayerService {
  private async repo() {
    const ds = await getDataSource();
    return ds.getRepository(Player);
  }

  /** Effectif senior actif, groupé par poste dans l'ordre gardiens → attaquants. */
  async getSquad(teamId: string): Promise<SquadGroup[]> {
    const repo = await this.repo();
    const players = await repo.find({
      where: { teamId, isActive: true, category: "seniors" },
      order: { number: "ASC" },
    });

    const groups = new Map<string, Player[]>();
    for (const player of players) {
      const key = player.position && POSITION_ORDER.includes(player.position) ? player.position : "OTHER";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(player);
    }

    return [...POSITION_ORDER, "OTHER"]
      .filter((key) => groups.has(key))
      .map((key) => ({
        label: key === "OTHER" ? "Autres" : POSITION_LABELS[key],
        players: groups.get(key)!,
      }));
  }
}
