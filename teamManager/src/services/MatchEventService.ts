import { getDataSource } from "@/lib/database";
import { MatchEvent, MatchEventType } from "@/entities/MatchEvent";
import { Repository } from "typeorm";
import type { MatchKind } from "@/entities/MatchLineup";

export interface PlayerEventAggregate {
  goals: number;
  ownGoals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
}

/**
 * Service for MatchEvent operations — journal d'événements horodatés d'un
 * match (but, passe décisive, cartons, changements). Base pour remplacer à
 * terme la saisie manuelle de `cms_player_stats` (`getPlayerAggregates`),
 * qui reste utilisable en parallèle : rien n'est cassé côté saisie
 * manuelle existante.
 */
export class MatchEventService {
  private async getRepository(): Promise<Repository<MatchEvent>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(MatchEvent);
  }

  async findForMatch(teamId: string, matchType: MatchKind, matchId: string | number): Promise<MatchEvent[]> {
    const repository = await this.getRepository();
    const where =
      matchType === "OFFICIAL" ? { teamId, matchType, matchId: String(matchId) } : { teamId, matchType, friendlyMatchId: Number(matchId) };
    return repository.find({ where, relations: ["player", "relatedPlayer"], order: { minute: "ASC", createdAt: "ASC" } });
  }

  async create(
    data: {
      matchType: MatchKind;
      matchId?: string | null;
      friendlyMatchId?: number | null;
      eventType: MatchEventType;
      teamSide: "HOME" | "AWAY";
      playerId?: string | null;
      relatedPlayerId?: string | null;
      minute?: number | null;
      notes?: string | null;
    },
    teamId: string,
    createdBy: string
  ): Promise<MatchEvent> {
    if (data.matchType === "OFFICIAL" && !data.matchId) {
      throw new Error("Match officiel requis");
    }
    if (data.matchType === "FRIENDLY" && !data.friendlyMatchId) {
      throw new Error("Match amical requis");
    }
    const repository = await this.getRepository();
    const event = repository.create({ ...data, teamId, createdBy });
    return repository.save(event);
  }

  async delete(id: number, teamId: string): Promise<boolean> {
    const repository = await this.getRepository();
    const event = await repository.findOne({ where: { id, teamId } });
    if (!event) {
      throw new Error("Événement non trouvé");
    }
    await repository.remove(event);
    return true;
  }

  /** Agrégats calculés à partir du journal d'événements pour un joueur (sur un ensemble de matchs donné, ou tout l'historique). */
  async getPlayerAggregates(teamId: string, playerId: string): Promise<PlayerEventAggregate> {
    const repository = await this.getRepository();
    const events = await repository.find({ where: { teamId, playerId } });

    const aggregate: PlayerEventAggregate = { goals: 0, ownGoals: 0, assists: 0, yellowCards: 0, redCards: 0 };
    for (const event of events) {
      switch (event.eventType) {
        case "GOAL":
          aggregate.goals += 1;
          break;
        case "OWN_GOAL":
          aggregate.ownGoals += 1;
          break;
        case "ASSIST":
          aggregate.assists += 1;
          break;
        case "YELLOW_CARD":
          aggregate.yellowCards += 1;
          break;
        case "RED_CARD":
          aggregate.redCards += 1;
          break;
      }
    }
    return aggregate;
  }
}
