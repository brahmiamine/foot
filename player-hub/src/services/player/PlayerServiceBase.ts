import { getDataSource } from "@/lib/database";
import { Player } from "@/entities/Player";

export interface MatchInfo {
  kind: "OFFICIAL" | "FRIENDLY";
  id: string;
  date: Date | null;
  opponentName: string;
  isHome: boolean;
  scoreHome: number | null;
  scoreAway: number | null;
  status: string;
}

export class PlayerServiceBase {
  protected async ds() {
    return getDataSource();
  }

  async getPlayer(playerId: string): Promise<Player | null> {
    const ds = await this.ds();
    return ds.getRepository(Player).findOne({ where: { id: playerId } });
  }
}
