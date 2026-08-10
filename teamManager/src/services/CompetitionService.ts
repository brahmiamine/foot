import { getDataSource } from "@/lib/database";
import { Competition, CompetitionStatus } from "@/entities/Competition";
import { CompetitionParticipant } from "@/entities/CompetitionParticipant";
import { FriendlyMatch } from "@/entities/FriendlyMatch";
import { Repository } from "typeorm";
import { AgeCategory } from "@/types/categories";

export interface StandingRow {
  participantId: number;
  name: string;
  logoUrl: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

/**
 * Service for Competition operations — compétitions organisées par le club
 * (tournois internes, coupes amicales), distinctes du calendrier fédéral
 * partagé. Le classement (`getStandings`) est toujours recalculé à la
 * volée à partir des `cms_friendly_matches` terminés rattachés à la
 * compétition, jamais stocké.
 */
export class CompetitionService {
  private async getRepository(): Promise<Repository<Competition>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Competition);
  }

  private async getParticipantRepository(): Promise<Repository<CompetitionParticipant>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(CompetitionParticipant);
  }

  private async getFriendlyMatchRepository(): Promise<Repository<FriendlyMatch>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(FriendlyMatch);
  }

  async findAll(teamId: string): Promise<Competition[]> {
    const repository = await this.getRepository();
    return repository.find({ where: { teamId }, relations: ["season"], order: { createdAt: "DESC" } });
  }

  async findById(id: number, teamId: string): Promise<Competition | null> {
    const repository = await this.getRepository();
    return repository.findOne({ where: { id, teamId }, relations: ["season"] });
  }

  async create(
    data: {
      name: string;
      type: Competition["type"];
      category?: AgeCategory | null;
      format?: Competition["format"];
      pointsWin?: number;
      pointsDraw?: number;
      pointsLoss?: number;
      seasonId?: number | null;
      startDate?: string | null;
      endDate?: string | null;
      notes?: string | null;
    },
    teamId: string
  ): Promise<Competition> {
    const repository = await this.getRepository();
    const competition = repository.create({ ...data, teamId, status: "PLANNED" });
    return repository.save(competition);
  }

  async update(
    id: number,
    teamId: string,
    data: Partial<{
      name: string;
      type: Competition["type"];
      category: AgeCategory | null;
      format: Competition["format"];
      pointsWin: number;
      pointsDraw: number;
      pointsLoss: number;
      status: CompetitionStatus;
      seasonId: number | null;
      startDate: string | null;
      endDate: string | null;
      notes: string | null;
    }>
  ): Promise<Competition> {
    const repository = await this.getRepository();
    const competition = await this.findById(id, teamId);
    if (!competition) {
      throw new Error("Compétition non trouvée");
    }
    Object.assign(competition, data);
    return repository.save(competition);
  }

  async delete(id: number, teamId: string): Promise<boolean> {
    const repository = await this.getRepository();
    const competition = await this.findById(id, teamId);
    if (!competition) {
      throw new Error("Compétition non trouvée");
    }
    await repository.remove(competition);
    return true;
  }

  // ---- Participants -------------------------------------------------

  async findParticipants(competitionId: number): Promise<CompetitionParticipant[]> {
    const repository = await this.getParticipantRepository();
    return repository.find({ where: { competitionId }, relations: ["internalTeam", "externalTeam"], order: { createdAt: "ASC" } });
  }

  async addParticipant(
    competitionId: number,
    data: { internalTeamId?: number | null; externalTeamId?: string | null; externalName?: string | null; logoUrl?: string | null }
  ): Promise<CompetitionParticipant> {
    if (!data.internalTeamId && !data.externalTeamId && !data.externalName) {
      throw new Error("Un participant doit être une équipe interne, un club référencé ou un nom");
    }
    const repository = await this.getParticipantRepository();
    const participant = repository.create({ competitionId, ...data });
    return repository.save(participant);
  }

  async removeParticipant(id: number, competitionId: number): Promise<boolean> {
    const repository = await this.getParticipantRepository();
    const participant = await repository.findOne({ where: { id, competitionId } });
    if (!participant) {
      throw new Error("Participant non trouvé");
    }
    await repository.remove(participant);
    return true;
  }

  // ---- Classement (calculé à la volée) -------------------------------

  async getStandings(competitionId: number): Promise<StandingRow[]> {
    const participants = await this.findParticipants(competitionId);
    const rows = new Map<number, StandingRow>();
    for (const p of participants) {
      rows.set(p.id, {
        participantId: p.id,
        name: p.internalTeam?.name ?? p.externalTeam?.nom ?? p.externalName ?? "Participant",
        logoUrl: p.externalTeam?.logoUrl ?? p.logoUrl ?? null,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
        points: 0,
      });
    }

    const matchRepository = await this.getFriendlyMatchRepository();
    const matches = await matchRepository.find({ where: { competitionId, status: "FINISHED" } });
    const competitionRepository = await this.getRepository();
    const competition = await competitionRepository.findOne({ where: { id: competitionId } });
    if (!competition) return Array.from(rows.values());

    for (const match of matches) {
      if (match.homeParticipantId == null || match.awayParticipantId == null) continue;
      if (match.scoreHome == null || match.scoreAway == null) continue;

      const home = rows.get(match.homeParticipantId);
      const away = rows.get(match.awayParticipantId);
      if (!home || !away) continue;

      home.played += 1;
      away.played += 1;
      home.goalsFor += match.scoreHome;
      home.goalsAgainst += match.scoreAway;
      away.goalsFor += match.scoreAway;
      away.goalsAgainst += match.scoreHome;

      if (match.scoreHome > match.scoreAway) {
        home.won += 1;
        home.points += competition.pointsWin;
        away.lost += 1;
        away.points += competition.pointsLoss;
      } else if (match.scoreHome < match.scoreAway) {
        away.won += 1;
        away.points += competition.pointsWin;
        home.lost += 1;
        home.points += competition.pointsLoss;
      } else {
        home.drawn += 1;
        away.drawn += 1;
        home.points += competition.pointsDraw;
        away.points += competition.pointsDraw;
      }
    }

    for (const row of rows.values()) {
      row.goalDiff = row.goalsFor - row.goalsAgainst;
    }

    return Array.from(rows.values()).sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor);
  }
}
