import { In } from "typeorm";
import { PlayerStat } from "@/entities/PlayerStat";
import { Card } from "@/entities/Card";
import { Suspension } from "@/entities/Suspension";
import { Fine } from "@/entities/Fine";
import { Trip } from "@/entities/Trip";
import { TripParticipant, type TripTransportOffer } from "@/entities/TripParticipant";
import { PlayerEngagementService } from "./PlayerEngagementService";

export class PlayerProfileService extends PlayerEngagementService {
  async getStats(playerId: string): Promise<PlayerStat[]> {
    const ds = await this.ds();
    return ds.getRepository(PlayerStat).find({
      where: { playerId },
      order: { createdAt: "DESC" },
    });
  }

  async getSeasonSummary(playerId: string): Promise<{
    matches: number;
    minutesPlayed: number;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
    trainingsAttended: number;
    trainingsTotal: number;
  }> {
    const stats = await this.getStats(playerId);
    return stats.reduce(
      (acc, stat) => ({
        matches: acc.matches + (stat.minutesPlayed > 0 ? 1 : 0),
        minutesPlayed: acc.minutesPlayed + stat.minutesPlayed,
        goals: acc.goals + stat.goals,
        assists: acc.assists + stat.assists,
        yellowCards: acc.yellowCards + stat.yellowCards,
        redCards: acc.redCards + stat.redCards,
        trainingsAttended: acc.trainingsAttended + stat.trainingsAttended,
        trainingsTotal: acc.trainingsTotal + stat.trainingsTotal,
      }),
      {
        matches: 0,
        minutesPlayed: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        trainingsAttended: 0,
        trainingsTotal: 0,
      },
    );
  }

  async getDiscipline(
    playerId: string,
  ): Promise<{ cards: Card[]; suspensions: Suspension[]; fines: Fine[] }> {
    const ds = await this.ds();
    const [cards, suspensions, fines] = await Promise.all([
      ds.getRepository(Card).find({ where: { playerId }, order: { createdAt: "DESC" } }),
      ds.getRepository(Suspension).find({ where: { playerId }, order: { createdAt: "DESC" } }),
      ds.getRepository(Fine).find({ where: { playerId }, order: { createdAt: "DESC" } }),
    ]);
    return { cards, suspensions, fines };
  }

  async getTrips(playerId: string): Promise<Array<{ participant: TripParticipant; trip: Trip | null }>> {
    const ds = await this.ds();
    const participants = await ds.getRepository(TripParticipant).find({
      where: { playerId },
      order: { createdAt: "DESC" },
    });
    const tripIds = [...new Set(participants.map((participant) => participant.tripId))];
    const trips = tripIds.length
      ? await ds.getRepository(Trip).find({ where: { id: In(tripIds) } })
      : [];
    const byId = new Map(trips.map((trip) => [trip.id, trip]));
    return participants.map((participant) => ({
      participant,
      trip: byId.get(participant.tripId) ?? null,
    }));
  }

  async respondToTrip(
    playerId: string,
    participantId: number,
    transportOffer: TripTransportOffer,
    offeredSeats: number | null,
  ): Promise<{ success: boolean; error?: string }> {
    const ds = await this.ds();
    const repo = ds.getRepository(TripParticipant);
    const participant = await repo.findOne({ where: { id: participantId, playerId } });
    if (!participant) return { success: false, error: "not_found" };

    participant.transportOffer = transportOffer;
    participant.offeredSeats = transportOffer === "CAN_DRIVE" ? offeredSeats : null;
    participant.confirmed = true;
    await repo.save(participant);
    return { success: true };
  }
}
