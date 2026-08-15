import { Injury } from "@/entities/Injury";
import { Suspension } from "@/entities/Suspension";
import { Convocation } from "@/entities/Convocation";
import { PlayerProfileService } from "./PlayerProfileService";
import type { MatchInfo } from "./PlayerServiceBase";

export class PlayerPlanningService extends PlayerProfileService {
  async getNextConvocation(
    playerId: string,
  ): Promise<{ convocation: Convocation; match: MatchInfo | null } | null> {
    const convocations = await this.getConvocations(playerId);
    const now = Date.now();
    const upcoming: Array<{ convocation: Convocation; match: MatchInfo }> = [];

    for (const convocation of convocations) {
      if (convocation.cancelledAt) continue;
      const match = await this.resolveConvocationMatch(convocation);
      if (
        match?.date &&
        match.date.getTime() >= now &&
        match.status !== "FINISHED" &&
        match.status !== "CANCELLED"
      ) {
        upcoming.push({ convocation, match });
      }
    }

    upcoming.sort((a, b) => a.match.date!.getTime() - b.match.date!.getTime());
    return upcoming[0] ?? null;
  }

  async getAgenda(
    playerId: string,
    withinDays = 7,
    includeTrips = false,
  ): Promise<Array<{ type: "MATCH" | "TRAINING" | "TRIP"; date: Date; title: string; id: string }>> {
    const now = Date.now();
    const horizon = now + withinDays * 24 * 60 * 60 * 1000;
    const entries: Array<{
      type: "MATCH" | "TRAINING" | "TRIP";
      date: Date;
      title: string;
      id: string;
    }> = [];

    const convocations = await this.getConvocations(playerId);
    for (const convocation of convocations) {
      if (convocation.cancelledAt) continue;
      const match = await this.resolveConvocationMatch(convocation);
      if (match?.date && match.date.getTime() >= now && match.date.getTime() <= horizon) {
        entries.push({
          type: "MATCH",
          date: match.date,
          title: `${match.isHome ? "" : "@ "}${match.opponentName}`,
          id: `${match.kind}-${match.id}`,
        });
      }
    }

    const trainings = await this.getTrainingInvitations(playerId);
    for (const { invitation, training } of trainings) {
      if (!training || training.status === "CANCELLED") continue;
      if (training.date.getTime() >= now && training.date.getTime() <= horizon) {
        entries.push({
          type: "TRAINING",
          date: training.date,
          title: training.title,
          id: String(invitation.id),
        });
      }
    }

    if (includeTrips) {
      const trips = await this.getTrips(playerId);
      for (const { participant, trip } of trips) {
        if (!trip) continue;
        if (trip.departureTime.getTime() >= now && trip.departureTime.getTime() <= horizon) {
          entries.push({
            type: "TRIP",
            date: trip.departureTime,
            title: trip.meetingPoint ?? "Déplacement",
            id: String(participant.id),
          });
        }
      }
    }

    entries.sort((a, b) => a.date.getTime() - b.date.getTime());
    return entries;
  }

  async getAvailability(playerId: string, teamId: string): Promise<{
    available: boolean;
    reason: "INJURED" | "SUSPENDED" | null;
    injury: Injury | null;
    activeSuspension: Suspension | null;
  }> {
    const ds = await this.ds();
    const injury = await ds.getRepository(Injury).findOne({
      where: [
        { playerId, status: "ONGOING" },
        { playerId, status: "RECOVERING" },
      ],
      order: { createdAt: "DESC" },
    });
    const suspensions = await ds.getRepository(Suspension).find({
      where: { playerId, status: "ACTIVE" },
    });
    const activeSuspension =
      suspensions.find((suspension) => suspension.matchesPurged < suspension.matchesCount) ?? null;

    void teamId;
    if (injury) return { available: false, reason: "INJURED", injury, activeSuspension };
    if (activeSuspension) {
      return { available: false, reason: "SUSPENDED", injury: null, activeSuspension };
    }
    return { available: true, reason: null, injury: null, activeSuspension: null };
  }
}
