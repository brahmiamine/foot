import { In } from "typeorm";
import { getDataSource } from "@/lib/database";
import { Player } from "@/entities/Player";
import { Staff } from "@/entities/Staff";
import { Match } from "@/entities/Match";
import { FriendlyMatch } from "@/entities/FriendlyMatch";
import { Convocation } from "@/entities/Convocation";
import { Training } from "@/entities/Training";
import { TrainingInvitation, type TrainingInvitationResponse } from "@/entities/TrainingInvitation";
import { PlayerStat } from "@/entities/PlayerStat";
import { Suspension } from "@/entities/Suspension";
import { Injury } from "@/entities/Injury";
import { Trip } from "@/entities/Trip";
import { TripParticipant } from "@/entities/TripParticipant";
import { MatchLineup, type LineupRole } from "@/entities/MatchLineup";
import { MatchFormation } from "@/entities/MatchFormation";
import { TacticsBoard } from "@/entities/TacticsBoard";
import { Team } from "@/entities/Team";
import type { AgeCategory } from "@/types/categories";

export type CategoryScope = "ALL" | AgeCategory[];

function categoryWhere(categories: CategoryScope) {
  return categories === "ALL" ? undefined : In(categories);
}

export interface MatchInfo {
  kind: "OFFICIAL" | "FRIENDLY";
  id: string;
  date: Date | null;
  opponentName: string;
  isHome: boolean;
  status: string;
}

/**
 * Logique métier "vue staff" de staff-hub, au-dessus des mêmes tables que
 * club-hub — voir src/entities/*.ts. Chaque méthode de lecture accepte le
 * `CategoryScope` résolu par lib/access.ts (rôles non globaux : catégories
 * du club auxquelles l'utilisateur a droit) ; chaque méthode d'écriture
 * suppose que l'appelant (Server Action) a déjà vérifié la permission
 * adéquate via requirePermission() — ce service ne revérifie pas le RBAC
 * lui-même, il fait confiance à la couche qui l'appelle (comme
 * club-hub/src/services/*Service.ts).
 */
export class StaffPortalService {
  private async ds() {
    return getDataSource();
  }

  // ---- Effectif ----

  async getRoster(teamId: string, categories: CategoryScope): Promise<Player[]> {
    const ds = await this.ds();
    const where = categories === "ALL" ? { teamId } : { teamId, category: categoryWhere(categories) };
    return ds.getRepository(Player).find({ where, order: { number: "ASC" } });
  }

  async getStaffList(teamId: string, categories: CategoryScope): Promise<Staff[]> {
    const ds = await this.ds();
    const where = categories === "ALL" ? { teamId } : { teamId, category: categoryWhere(categories) };
    return ds.getRepository(Staff).find({ where, order: { lastNameFr: "ASC" } });
  }

  async getAvailability(playerIds: string[]): Promise<Map<string, "AVAILABLE" | "INJURED" | "SUSPENDED">> {
    const ds = await this.ds();
    const map = new Map<string, "AVAILABLE" | "INJURED" | "SUSPENDED">();
    if (playerIds.length === 0) return map;

    const injuries = await ds.getRepository(Injury).find({
      where: [
        { playerId: In(playerIds), status: "ONGOING" },
        { playerId: In(playerIds), status: "RECOVERING" },
      ],
    });
    const suspensions = await ds.getRepository(Suspension).find({ where: { playerId: In(playerIds), status: "ACTIVE" } });

    for (const id of playerIds) map.set(id, "AVAILABLE");
    for (const s of suspensions) {
      if (s.matchesPurged < s.matchesCount) map.set(s.playerId, "SUSPENDED");
    }
    for (const i of injuries) map.set(i.playerId, "INJURED");

    return map;
  }

  // ---- Matchs ----

  private async resolveMatch(teamId: string, matchId: string): Promise<MatchInfo | null> {
    const ds = await this.ds();
    const match = await ds.getRepository(Match).findOne({ where: { id: matchId } });
    if (!match) return null;
    const isHome = match.equipeHome === teamId;
    const opponentTeamId = isHome ? match.equipeAway : match.equipeHome;
    const opponent = await ds.getRepository(Team).findOne({ where: { id: opponentTeamId } });
    return { kind: "OFFICIAL", id: match.id, date: match.date ?? null, opponentName: opponent?.nom ?? "Adversaire", isHome, status: match.status };
  }

  async listMatches(teamId: string): Promise<MatchInfo[]> {
    const ds = await this.ds();
    const official = await ds.getRepository(Match).find({ where: [{ equipeHome: teamId }, { equipeAway: teamId }], order: { date: "DESC" } });
    const officialInfo = await Promise.all(official.map((m) => this.resolveMatch(teamId, m.id)));
    const friendly = await ds.getRepository(FriendlyMatch).find({ where: { teamId }, order: { date: "DESC" } });
    const friendlyInfo: MatchInfo[] = friendly.map((m) => ({
      kind: "FRIENDLY",
      id: String(m.id),
      date: m.date,
      opponentName: m.opponentName ?? "Adversaire",
      isHome: m.isHome,
      status: m.status,
    }));
    return [...officialInfo.filter((m): m is MatchInfo => !!m), ...friendlyInfo].sort(
      (a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0)
    );
  }

  async createFriendlyMatch(data: {
    teamId: string;
    category: AgeCategory;
    opponentName: string;
    isHome: boolean;
    venueName?: string;
    date: Date;
  }): Promise<FriendlyMatch> {
    const ds = await this.ds();
    const repo = ds.getRepository(FriendlyMatch);
    const match = repo.create({ ...data, status: "UPCOMING" });
    return repo.save(match);
  }

  // ---- Entraînements ----

  async listTrainings(teamId: string, categories: CategoryScope): Promise<Training[]> {
    const ds = await this.ds();
    const where = categories === "ALL" ? { teamId } : { teamId, category: categoryWhere(categories) };
    return ds.getRepository(Training).find({ where, order: { date: "DESC" } });
  }

  async createTraining(data: Partial<Training> & { teamId: string; category: AgeCategory; title: string; date: Date }): Promise<Training> {
    const ds = await this.ds();
    const repo = ds.getRepository(Training);
    const training = repo.create({ status: "SCHEDULED", ...data });
    return repo.save(training);
  }

  async cancelTraining(id: number, teamId: string): Promise<void> {
    const ds = await this.ds();
    const repo = ds.getRepository(Training);
    const training = await repo.findOne({ where: { id, teamId } });
    if (!training) return;
    training.status = "CANCELLED";
    await repo.save(training);
  }

  async getInvitationsForTraining(trainingId: number): Promise<Array<{ invitation: TrainingInvitation; player: Player | null }>> {
    const ds = await this.ds();
    const invitations = await ds.getRepository(TrainingInvitation).find({ where: { trainingId } });
    const playerIds = invitations.map((i) => i.playerId);
    const players = playerIds.length ? await ds.getRepository(Player).find({ where: { id: In(playerIds) } }) : [];
    const byId = new Map(players.map((p) => [p.id, p]));
    return invitations.map((invitation) => ({ invitation, player: byId.get(invitation.playerId) ?? null }));
  }

  /** Invite tout l'effectif de la catégorie de l'entraînement qui n'a pas encore d'invitation. */
  async inviteRosterToTraining(trainingId: number, teamId: string): Promise<number> {
    const ds = await this.ds();
    const training = await ds.getRepository(Training).findOne({ where: { id: trainingId, teamId } });
    if (!training) return 0;

    const roster = await ds.getRepository(Player).find({ where: { teamId, category: training.category, isActive: true } });
    const existing = await ds.getRepository(TrainingInvitation).find({ where: { trainingId } });
    const alreadyInvited = new Set(existing.map((i) => i.playerId));

    const repo = ds.getRepository(TrainingInvitation);
    const toCreate = roster
      .filter((p) => !alreadyInvited.has(p.id))
      .map((p) => repo.create({ trainingId, playerId: p.id, response: "PENDING", notifiedAt: new Date() }));
    if (toCreate.length > 0) await repo.save(toCreate);
    return toCreate.length;
  }

  async setAttendance(invitationId: number, response: TrainingInvitationResponse): Promise<void> {
    const ds = await this.ds();
    const repo = ds.getRepository(TrainingInvitation);
    const invitation = await repo.findOne({ where: { id: invitationId } });
    if (!invitation) return;
    invitation.response = response;
    invitation.respondedAt = new Date();
    await repo.save(invitation);
  }

  async getAttendanceReport(
    teamId: string,
    categories: CategoryScope
  ): Promise<Array<{ player: Player; attended: number; total: number }>> {
    const roster = await this.getRoster(teamId, categories);
    const ds = await this.ds();
    const playerIds = roster.map((p) => p.id);
    if (playerIds.length === 0) return [];

    const invitations = await ds.getRepository(TrainingInvitation).find({ where: { playerId: In(playerIds) } });
    const byPlayer = new Map<string, TrainingInvitation[]>();
    for (const inv of invitations) {
      if (!byPlayer.has(inv.playerId)) byPlayer.set(inv.playerId, []);
      byPlayer.get(inv.playerId)!.push(inv);
    }

    return roster.map((player) => {
      const list = byPlayer.get(player.id) ?? [];
      const decided = list.filter((i) => i.response !== "PENDING");
      const attended = list.filter((i) => i.response === "PRESENT" || i.response === "LATE").length;
      return { player, attended, total: decided.length };
    });
  }

  // ---- Convocations ----

  async listConvocations(teamId: string): Promise<Convocation[]> {
    const ds = await this.ds();
    return ds.getRepository(Convocation).find({ where: { teamId }, order: { createdAt: "DESC" } });
  }

  async resolveConvocationMatch(convocation: Convocation): Promise<MatchInfo | null> {
    if (convocation.matchType === "FRIENDLY" && convocation.friendlyMatchId) {
      const ds = await this.ds();
      const match = await ds.getRepository(FriendlyMatch).findOne({ where: { id: convocation.friendlyMatchId } });
      if (!match) return null;
      return { kind: "FRIENDLY", id: String(match.id), date: match.date, opponentName: match.opponentName ?? "Adversaire", isHome: match.isHome, status: match.status };
    }
    if (convocation.matchId) return this.resolveMatch(convocation.teamId, convocation.matchId);
    return null;
  }

  async getConvocationsForMatch(teamId: string, matchType: "OFFICIAL" | "FRIENDLY", matchId?: string, friendlyMatchId?: number): Promise<Convocation[]> {
    const ds = await this.ds();
    return ds.getRepository(Convocation).find({
      where: matchType === "OFFICIAL" ? { teamId, matchType, matchId } : { teamId, matchType, friendlyMatchId },
    });
  }

  /** Convoque une liste de joueurs pour un match — ignore les joueurs déjà convoqués pour ce match. */
  async createConvocations(
    teamId: string,
    matchType: "OFFICIAL" | "FRIENDLY",
    playerIds: string[],
    matchId?: string,
    friendlyMatchId?: number
  ): Promise<number> {
    const ds = await this.ds();
    const existing = await this.getConvocationsForMatch(teamId, matchType, matchId, friendlyMatchId);
    const already = new Set(existing.map((c) => c.playerId));

    const repo = ds.getRepository(Convocation);
    const toCreate = playerIds
      .filter((id) => !already.has(id))
      .map((playerId) =>
        repo.create({
          teamId,
          matchType,
          matchId: matchType === "OFFICIAL" ? matchId ?? null : null,
          friendlyMatchId: matchType === "FRIENDLY" ? friendlyMatchId ?? null : null,
          playerId,
          response: "PENDING",
          notifiedAt: new Date(),
        })
      );
    if (toCreate.length > 0) await repo.save(toCreate);
    return toCreate.length;
  }

  // ---- Composition ----

  async getFormation(teamId: string, matchType: "OFFICIAL" | "FRIENDLY", matchId?: string, friendlyMatchId?: number): Promise<MatchFormation | null> {
    const ds = await this.ds();
    return ds.getRepository(MatchFormation).findOne({
      where: matchType === "OFFICIAL" ? { teamId, matchType, matchId } : { teamId, matchType, friendlyMatchId },
    });
  }

  async setFormation(teamId: string, matchType: "OFFICIAL" | "FRIENDLY", formation: string, matchId?: string, friendlyMatchId?: number): Promise<void> {
    const ds = await this.ds();
    const repo = ds.getRepository(MatchFormation);
    let entry = await this.getFormation(teamId, matchType, matchId, friendlyMatchId);
    if (!entry) {
      entry = repo.create({ teamId, matchType, matchId: matchId ?? null, friendlyMatchId: friendlyMatchId ?? null, formation });
    } else {
      entry.formation = formation;
    }
    await repo.save(entry);
  }

  async getLineup(teamId: string, matchType: "OFFICIAL" | "FRIENDLY", matchId?: string, friendlyMatchId?: number): Promise<MatchLineup[]> {
    const ds = await this.ds();
    return ds.getRepository(MatchLineup).find({
      where: matchType === "OFFICIAL" ? { teamId, matchType, matchId } : { teamId, matchType, friendlyMatchId },
    });
  }

  async setLineupEntry(
    teamId: string,
    matchType: "OFFICIAL" | "FRIENDLY",
    playerId: string,
    role: LineupRole,
    options: { matchId?: string; friendlyMatchId?: number; shirtNumber?: number | null; position?: string | null; isCaptain?: boolean }
  ): Promise<void> {
    const ds = await this.ds();
    const repo = ds.getRepository(MatchLineup);
    const where = matchType === "OFFICIAL" ? { teamId, matchType, matchId: options.matchId, playerId } : { teamId, matchType, friendlyMatchId: options.friendlyMatchId, playerId };
    let entry = await repo.findOne({ where });
    if (!entry) {
      entry = repo.create({ teamId, matchType, matchId: options.matchId ?? null, friendlyMatchId: options.friendlyMatchId ?? null, playerId });
    }
    entry.role = role;
    entry.shirtNumber = options.shirtNumber ?? null;
    entry.position = options.position ?? null;
    entry.isCaptain = options.isCaptain ?? false;
    await repo.save(entry);
  }

  async removeLineupEntry(id: number, teamId: string): Promise<void> {
    const ds = await this.ds();
    const repo = ds.getRepository(MatchLineup);
    const entry = await repo.findOne({ where: { id, teamId } });
    if (entry) await repo.remove(entry);
  }

  // ---- Tactique (lecture seule) ----

  async listTacticsBoards(teamId: string, categories: CategoryScope): Promise<TacticsBoard[]> {
    const ds = await this.ds();
    const boards = await ds.getRepository(TacticsBoard).find({ where: { teamId }, order: { createdAt: "DESC" } });
    if (categories === "ALL") return boards;
    return boards.filter((b) => !b.category || categories.includes(b.category as AgeCategory));
  }

  // ---- Statistiques ----

  async listStats(teamId: string, categories: CategoryScope): Promise<PlayerStat[]> {
    const roster = await this.getRoster(teamId, categories);
    const ds = await this.ds();
    const playerIds = roster.map((p) => p.id);
    if (playerIds.length === 0) return [];
    return ds.getRepository(PlayerStat).find({ where: { playerId: In(playerIds) }, order: { createdAt: "DESC" } });
  }

  async createStat(data: Partial<PlayerStat> & { teamId: string; playerId: string; createdBy?: string }): Promise<PlayerStat> {
    const ds = await this.ds();
    const repo = ds.getRepository(PlayerStat);
    const stat = repo.create(data);
    return repo.save(stat);
  }

  // ---- Déplacements ----

  async listTrips(teamId: string, categories: CategoryScope): Promise<Trip[]> {
    const ds = await this.ds();
    const where = categories === "ALL" ? { teamId } : { teamId, category: categoryWhere(categories) };
    return ds.getRepository(Trip).find({ where, order: { departureTime: "DESC" } });
  }

  async createTrip(data: Partial<Trip> & { teamId: string; category: AgeCategory; departureTime: Date }): Promise<Trip> {
    const ds = await this.ds();
    const repo = ds.getRepository(Trip);
    const trip = repo.create(data);
    return repo.save(trip);
  }

  async getTripParticipants(tripId: number): Promise<Array<{ participant: TripParticipant; player: Player | null }>> {
    const ds = await this.ds();
    const participants = await ds.getRepository(TripParticipant).find({ where: { tripId } });
    const playerIds = participants.map((p) => p.playerId).filter((id): id is string => !!id);
    const players = playerIds.length ? await ds.getRepository(Player).find({ where: { id: In(playerIds) } }) : [];
    const byId = new Map(players.map((p) => [p.id, p]));
    return participants.map((participant) => ({ participant, player: participant.playerId ? byId.get(participant.playerId) ?? null : null }));
  }

  /** Ajoute tout l'effectif de la catégorie du déplacement comme participant "PLAYER" (transportOffer NONE par défaut). */
  async addRosterToTrip(tripId: number, teamId: string): Promise<number> {
    const ds = await this.ds();
    const trip = await ds.getRepository(Trip).findOne({ where: { id: tripId, teamId } });
    if (!trip) return 0;

    const roster = await ds.getRepository(Player).find({ where: { teamId, category: trip.category, isActive: true } });
    const existing = await ds.getRepository(TripParticipant).find({ where: { tripId } });
    const already = new Set(existing.map((p) => p.playerId).filter(Boolean));

    const repo = ds.getRepository(TripParticipant);
    const toCreate = roster
      .filter((p) => !already.has(p.id))
      .map((p) => repo.create({ tripId, participantType: "PLAYER", playerId: p.id, transportOffer: "NONE" }));
    if (toCreate.length > 0) await repo.save(toCreate);
    return toCreate.length;
  }

  // ---- Agenda (tableau de bord + calendrier) ----

  async getNextTraining(teamId: string, categories: CategoryScope): Promise<Training | null> {
    const trainings = await this.listTrainings(teamId, categories);
    const now = Date.now();
    const upcoming = trainings
      .filter((t) => t.status !== "CANCELLED" && t.date.getTime() >= now)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    return upcoming[0] ?? null;
  }

  async getNextMatch(teamId: string): Promise<MatchInfo | null> {
    const matches = await this.listMatches(teamId);
    const now = Date.now();
    const upcoming = matches
      .filter((m) => m.status !== "FINISHED" && m.status !== "CANCELLED" && m.date && m.date.getTime() >= now)
      .sort((a, b) => a.date!.getTime() - b.date!.getTime());
    return upcoming[0] ?? null;
  }

  async getAgenda(
    teamId: string,
    categories: CategoryScope,
    withinDays = 30
  ): Promise<Array<{ type: "MATCH" | "TRAINING" | "TRIP"; date: Date; title: string; id: string }>> {
    const now = Date.now();
    const horizon = now + withinDays * 24 * 60 * 60 * 1000;
    const entries: Array<{ type: "MATCH" | "TRAINING" | "TRIP"; date: Date; title: string; id: string }> = [];

    const matches = await this.listMatches(teamId);
    for (const m of matches) {
      if (m.date && m.date.getTime() >= now && m.date.getTime() <= horizon && m.status !== "CANCELLED") {
        entries.push({ type: "MATCH", date: m.date, title: `${m.isHome ? "vs " : "@ "}${m.opponentName}`, id: `${m.kind}-${m.id}` });
      }
    }

    const trainings = await this.listTrainings(teamId, categories);
    for (const t of trainings) {
      if (t.status !== "CANCELLED" && t.date.getTime() >= now && t.date.getTime() <= horizon) {
        entries.push({ type: "TRAINING", date: t.date, title: t.title, id: String(t.id) });
      }
    }

    const trips = await this.listTrips(teamId, categories);
    for (const trip of trips) {
      if (trip.departureTime.getTime() >= now && trip.departureTime.getTime() <= horizon) {
        entries.push({ type: "TRIP", date: trip.departureTime, title: trip.meetingPoint ?? "Déplacement", id: String(trip.id) });
      }
    }

    entries.sort((a, b) => a.date.getTime() - b.date.getTime());
    return entries;
  }
}

export const staffPortalService = new StaffPortalService();
