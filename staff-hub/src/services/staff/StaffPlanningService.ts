import { In } from "typeorm";
import { Player } from "@/entities/Player";
import { PlayerStat } from "@/entities/PlayerStat";
import { Trip } from "@/entities/Trip";
import { TripParticipant } from "@/entities/TripParticipant";
import type { AgeCategory } from "@/types/categories";
import { StaffLineupService } from "./StaffLineupService";
import { categoryWhere, type CategoryScope, type MatchInfo } from "./StaffServiceBase";

export class StaffPlanningService extends StaffLineupService {
  async listStats(teamId: string, categories: CategoryScope): Promise<PlayerStat[]> {
    const roster = await this.getRoster(teamId, categories);
    const ds = await this.ds();
    const playerIds = roster.map((player) => player.id);
    if (playerIds.length === 0) return [];
    return ds.getRepository(PlayerStat).find({
      where: { playerId: In(playerIds) },
      order: { createdAt: "DESC" },
    });
  }

  async createStat(
    data: Partial<PlayerStat> & { teamId: string; playerId: string; createdBy?: string },
  ): Promise<PlayerStat> {
    const ds = await this.ds();
    const repo = ds.getRepository(PlayerStat);
    return repo.save(repo.create(data));
  }

  async listTrips(teamId: string, categories: CategoryScope): Promise<Trip[]> {
    const ds = await this.ds();
    const where = categories === "ALL" ? { teamId } : { teamId, category: categoryWhere(categories) };
    return ds.getRepository(Trip).find({ where, order: { departureTime: "DESC" } });
  }

  async createTrip(
    data: Partial<Trip> & { teamId: string; category: AgeCategory; departureTime: Date },
  ): Promise<Trip> {
    const ds = await this.ds();
    const repo = ds.getRepository(Trip);
    return repo.save(repo.create(data));
  }

  async getTripParticipants(
    tripId: number,
  ): Promise<Array<{ participant: TripParticipant; player: Player | null }>> {
    const ds = await this.ds();
    const participants = await ds.getRepository(TripParticipant).find({ where: { tripId } });
    const playerIds = participants
      .map((participant) => participant.playerId)
      .filter((id): id is string => !!id);
    const players = playerIds.length
      ? await ds.getRepository(Player).find({ where: { id: In(playerIds) } })
      : [];
    const byId = new Map(players.map((player) => [player.id, player]));
    return participants.map((participant) => ({
      participant,
      player: participant.playerId ? byId.get(participant.playerId) ?? null : null,
    }));
  }

  async addRosterToTrip(tripId: number, teamId: string): Promise<number> {
    const ds = await this.ds();
    const trip = await ds.getRepository(Trip).findOne({ where: { id: tripId, teamId } });
    if (!trip) return 0;

    const roster = await ds.getRepository(Player).find({
      where: { teamId, category: trip.category, isActive: true },
    });
    const existing = await ds.getRepository(TripParticipant).find({ where: { tripId } });
    const already = new Set(existing.map((participant) => participant.playerId).filter(Boolean));
    const repo = ds.getRepository(TripParticipant);
    const toCreate = roster
      .filter((player) => !already.has(player.id))
      .map((player) =>
        repo.create({
          tripId,
          participantType: "PLAYER",
          playerId: player.id,
          transportOffer: "NONE",
        }),
      );

    if (toCreate.length > 0) await repo.save(toCreate);
    return toCreate.length;
  }

  async getNextTraining(teamId: string, categories: CategoryScope) {
    const trainings = await this.listTrainings(teamId, categories);
    const now = Date.now();
    const upcoming = trainings
      .filter((training) => training.status !== "CANCELLED" && training.date.getTime() >= now)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    return upcoming[0] ?? null;
  }

  async getNextMatch(teamId: string): Promise<MatchInfo | null> {
    const matches = await this.listMatches(teamId);
    const now = Date.now();
    const upcoming = matches
      .filter(
        (match) =>
          match.status !== "FINISHED" &&
          match.status !== "CANCELLED" &&
          match.date &&
          match.date.getTime() >= now,
      )
      .sort((a, b) => a.date!.getTime() - b.date!.getTime());
    return upcoming[0] ?? null;
  }

  async getAgenda(
    teamId: string,
    categories: CategoryScope,
    withinDays = 30,
  ): Promise<Array<{ type: "MATCH" | "TRAINING" | "TRIP"; date: Date; title: string; id: string }>> {
    const now = Date.now();
    const horizon = now + withinDays * 24 * 60 * 60 * 1000;
    const entries: Array<{
      type: "MATCH" | "TRAINING" | "TRIP";
      date: Date;
      title: string;
      id: string;
    }> = [];

    const matches = await this.listMatches(teamId);
    for (const match of matches) {
      if (
        match.date &&
        match.date.getTime() >= now &&
        match.date.getTime() <= horizon &&
        match.status !== "CANCELLED"
      ) {
        entries.push({
          type: "MATCH",
          date: match.date,
          title: `${match.isHome ? "vs " : "@ "}${match.opponentName}`,
          id: `${match.kind}-${match.id}`,
        });
      }
    }

    const trainings = await this.listTrainings(teamId, categories);
    for (const training of trainings) {
      if (
        training.status !== "CANCELLED" &&
        training.date.getTime() >= now &&
        training.date.getTime() <= horizon
      ) {
        entries.push({
          type: "TRAINING",
          date: training.date,
          title: training.title,
          id: String(training.id),
        });
      }
    }

    const trips = await this.listTrips(teamId, categories);
    for (const trip of trips) {
      if (trip.departureTime.getTime() >= now && trip.departureTime.getTime() <= horizon) {
        entries.push({
          type: "TRIP",
          date: trip.departureTime,
          title: trip.meetingPoint ?? "Déplacement",
          id: String(trip.id),
        });
      }
    }

    entries.sort((a, b) => a.date.getTime() - b.date.getTime());
    return entries;
  }
}
