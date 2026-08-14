import { In } from "typeorm";
import { getDataSource } from "@/lib/database";
import { Player } from "@/entities/Player";
import { Match } from "@/entities/Match";
import { FriendlyMatch } from "@/entities/FriendlyMatch";
import { Convocation, type ConvocationResponse } from "@/entities/Convocation";
import { Training } from "@/entities/Training";
import { TrainingInvitation, type TrainingInvitationResponse } from "@/entities/TrainingInvitation";
import { PlayerStat } from "@/entities/PlayerStat";
import { Card } from "@/entities/Card";
import { Suspension } from "@/entities/Suspension";
import { Fine } from "@/entities/Fine";
import { Trip } from "@/entities/Trip";
import { TripParticipant, type TripTransportOffer } from "@/entities/TripParticipant";
import { Injury } from "@/entities/Injury";
import { Team } from "@/entities/Team";

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

/**
 * Toute la logique métier "vue joueur" de player-hub, au-dessus des tables
 * lecture-mostly de club-hub — voir src/entities/*.ts. Chaque méthode
 * d'écriture revérifie playerId côté serveur (jamais confiance dans une
 * valeur envoyée par le client) : un joueur ne modifie jamais que SES
 * propres lignes, jamais celles d'un coéquipier.
 */
export class PlayerPortalService {
  private async ds() {
    return getDataSource();
  }

  async getPlayer(playerId: string): Promise<Player | null> {
    const ds = await this.ds();
    return ds.getRepository(Player).findOne({ where: { id: playerId } });
  }

  // ---- Matchs (résolution officiel/amical) ----

  private async resolveMatch(teamId: string, matchId: string): Promise<MatchInfo | null> {
    const ds = await this.ds();
    const match = await ds.getRepository(Match).findOne({ where: { id: matchId } });
    if (!match) return null;
    const isHome = match.equipeHome === teamId;
    const opponentTeamId = isHome ? match.equipeAway : match.equipeHome;
    const opponent = await ds.getRepository(Team).findOne({ where: { id: opponentTeamId } });
    return {
      kind: "OFFICIAL",
      id: match.id,
      date: match.date ?? null,
      opponentName: opponent?.nom ?? "Adversaire",
      isHome,
      scoreHome: match.scoreHome ?? null,
      scoreAway: match.scoreAway ?? null,
      status: match.status,
    };
  }

  private async resolveFriendlyMatch(friendlyMatchId: number): Promise<MatchInfo | null> {
    const ds = await this.ds();
    const match = await ds.getRepository(FriendlyMatch).findOne({ where: { id: friendlyMatchId } });
    if (!match) return null;
    return {
      kind: "FRIENDLY",
      id: String(match.id),
      date: match.date,
      opponentName: match.opponentName ?? "Adversaire",
      isHome: match.isHome,
      scoreHome: match.scoreHome ?? null,
      scoreAway: match.scoreAway ?? null,
      status: match.status,
    };
  }

  async resolveConvocationMatch(convocation: Convocation): Promise<MatchInfo | null> {
    if (convocation.matchType === "FRIENDLY" && convocation.friendlyMatchId) {
      return this.resolveFriendlyMatch(convocation.friendlyMatchId);
    }
    if (convocation.matchId) {
      return this.resolveMatch(convocation.teamId, convocation.matchId);
    }
    return null;
  }

  // ---- Convocations ----

  async getConvocations(playerId: string): Promise<Convocation[]> {
    const ds = await this.ds();
    return ds.getRepository(Convocation).find({
      where: { playerId },
      order: { createdAt: "DESC" },
    });
  }

  async respondToConvocation(
    playerId: string,
    convocationId: number,
    response: Exclude<ConvocationResponse, "PENDING">
  ): Promise<{ success: boolean; error?: string }> {
    const ds = await this.ds();
    const repo = ds.getRepository(Convocation);
    const convocation = await repo.findOne({ where: { id: convocationId, playerId } });
    if (!convocation) return { success: false, error: "not_found" };
    if (convocation.cancelledAt) return { success: false, error: "cancelled" };

    convocation.response = response;
    convocation.respondedAt = new Date();
    await repo.save(convocation);
    return { success: true };
  }

  // ---- Entraînements ----

  async getTrainingInvitations(playerId: string): Promise<Array<{ invitation: TrainingInvitation; training: Training | null }>> {
    const ds = await this.ds();
    const invitations = await ds.getRepository(TrainingInvitation).find({
      where: { playerId },
      order: { createdAt: "DESC" },
    });
    const trainingIds = [...new Set(invitations.map((i) => i.trainingId))];
    const trainings = trainingIds.length
      ? await ds.getRepository(Training).find({ where: { id: In(trainingIds) } })
      : [];
    const byId = new Map(trainings.map((t) => [t.id, t]));
    return invitations.map((invitation) => ({ invitation, training: byId.get(invitation.trainingId) ?? null }));
  }

  async respondToTraining(
    playerId: string,
    invitationId: number,
    response: Exclude<TrainingInvitationResponse, "PENDING">
  ): Promise<{ success: boolean; error?: string }> {
    const ds = await this.ds();
    const repo = ds.getRepository(TrainingInvitation);
    const invitation = await repo.findOne({ where: { id: invitationId, playerId } });
    if (!invitation) return { success: false, error: "not_found" };

    invitation.response = response;
    invitation.respondedAt = new Date();
    await repo.save(invitation);
    return { success: true };
  }

  // ---- Statistiques ----

  async getStats(playerId: string): Promise<PlayerStat[]> {
    const ds = await this.ds();
    return ds.getRepository(PlayerStat).find({ where: { playerId }, order: { createdAt: "DESC" } });
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
      (acc, s) => ({
        matches: acc.matches + (s.minutesPlayed > 0 ? 1 : 0),
        minutesPlayed: acc.minutesPlayed + s.minutesPlayed,
        goals: acc.goals + s.goals,
        assists: acc.assists + s.assists,
        yellowCards: acc.yellowCards + s.yellowCards,
        redCards: acc.redCards + s.redCards,
        trainingsAttended: acc.trainingsAttended + s.trainingsAttended,
        trainingsTotal: acc.trainingsTotal + s.trainingsTotal,
      }),
      { matches: 0, minutesPlayed: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, trainingsAttended: 0, trainingsTotal: 0 }
    );
  }

  // ---- Discipline ----

  async getDiscipline(playerId: string): Promise<{ cards: Card[]; suspensions: Suspension[]; fines: Fine[] }> {
    const ds = await this.ds();
    const [cards, suspensions, fines] = await Promise.all([
      ds.getRepository(Card).find({ where: { playerId }, order: { createdAt: "DESC" } }),
      ds.getRepository(Suspension).find({ where: { playerId }, order: { createdAt: "DESC" } }),
      ds.getRepository(Fine).find({ where: { playerId }, order: { createdAt: "DESC" } }),
    ]);
    return { cards, suspensions, fines };
  }

  // ---- Déplacements ----

  async getTrips(playerId: string): Promise<Array<{ participant: TripParticipant; trip: Trip | null }>> {
    const ds = await this.ds();
    const participants = await ds.getRepository(TripParticipant).find({
      where: { playerId },
      order: { createdAt: "DESC" },
    });
    const tripIds = [...new Set(participants.map((p) => p.tripId))];
    const trips = tripIds.length ? await ds.getRepository(Trip).find({ where: { id: In(tripIds) } }) : [];
    const byId = new Map(trips.map((t) => [t.id, t]));
    return participants.map((participant) => ({ participant, trip: byId.get(participant.tripId) ?? null }));
  }

  async respondToTrip(
    playerId: string,
    participantId: number,
    transportOffer: TripTransportOffer,
    offeredSeats: number | null
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

  // ---- Agenda (accueil + calendrier) ----

  async getNextConvocation(playerId: string): Promise<{ convocation: Convocation; match: MatchInfo | null } | null> {
    const convocations = await this.getConvocations(playerId);
    const now = Date.now();
    const upcoming: Array<{ convocation: Convocation; match: MatchInfo }> = [];
    for (const convocation of convocations) {
      if (convocation.cancelledAt) continue;
      const match = await this.resolveConvocationMatch(convocation);
      if (match?.date && match.date.getTime() >= now && match.status !== "FINISHED" && match.status !== "CANCELLED") {
        upcoming.push({ convocation, match });
      }
    }
    upcoming.sort((a, b) => (a.match.date!.getTime() - b.match.date!.getTime()));
    return upcoming[0] ?? null;
  }

  async getAgenda(
    playerId: string,
    withinDays = 7,
    includeTrips = false
  ): Promise<Array<{ type: "MATCH" | "TRAINING" | "TRIP"; date: Date; title: string; id: string }>> {
    const now = Date.now();
    const horizon = now + withinDays * 24 * 60 * 60 * 1000;
    const entries: Array<{ type: "MATCH" | "TRAINING" | "TRIP"; date: Date; title: string; id: string }> = [];

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
        entries.push({ type: "TRAINING", date: training.date, title: training.title, id: String(invitation.id) });
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

  // ---- Disponibilité ----

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

    const suspensions = await ds.getRepository(Suspension).find({ where: { playerId, status: "ACTIVE" } });
    const activeSuspension = suspensions.find((s) => s.matchesPurged < s.matchesCount) ?? null;

    void teamId;
    if (injury) return { available: false, reason: "INJURED", injury, activeSuspension };
    if (activeSuspension) return { available: false, reason: "SUSPENDED", injury: null, activeSuspension };
    return { available: true, reason: null, injury: null, activeSuspension: null };
  }
}

export const playerPortalService = new PlayerPortalService();
