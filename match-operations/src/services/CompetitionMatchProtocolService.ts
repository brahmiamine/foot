import { IsNull, type EntityManager } from "typeorm";
import { getDataSource } from "@/lib/db";
import { CompetitionMatchProtocol } from "@/entities/CompetitionMatchProtocol";
import { Match } from "@/entities/Match";
import { Matchday } from "@/entities/Matchday";
import { MatchOfficialAssignment, type MatchOfficialAssignmentRole } from "@/entities/MatchOfficialAssignment";
import { Signature, type ActorRole } from "@/entities/Signature";
import { Substitution } from "@/entities/Substitution";
import { createClubLineupAdapter } from "@/adapters/club/createClubLineupAdapter";
import type { ClubLineupReadPort } from "../../../packages/domain-contracts/src/club-lineup";

export interface CompetitionMatchProtocolValue {
  seasonId: string;
  preMatchSigningDeadlineMinutes: number | null;
  maxBenchPlayers: number | null;
  maxSubstitutions: number | null;
  requireHomeSignature: boolean;
  requireAwaySignature: boolean;
  requireRefereeSignature: boolean;
  requireCenterReferee: boolean;
  requiredAssistantReferees: number;
  requireFourthOfficial: boolean;
  requireMatchDelegate: boolean;
  requireRefereeObserver: boolean;
  version: number;
  updatedBy: string | null;
  updatedAt: Date | null;
}

export type UpdateCompetitionMatchProtocolInput = Partial<
  Omit<CompetitionMatchProtocolValue, "seasonId" | "version" | "updatedBy" | "updatedAt">
>;

const LEGACY_DEFAULTS = {
  preMatchSigningDeadlineMinutes: null,
  maxBenchPlayers: null,
  maxSubstitutions: null,
  requireHomeSignature: true,
  requireAwaySignature: true,
  requireRefereeSignature: true,
  requireCenterReferee: false,
  requiredAssistantReferees: 0,
  requireFourthOfficial: false,
  requireMatchDelegate: false,
  requireRefereeObserver: false,
} as const;

const BOOLEAN_FIELDS = [
  "requireHomeSignature",
  "requireAwaySignature",
  "requireRefereeSignature",
  "requireCenterReferee",
  "requireFourthOfficial",
  "requireMatchDelegate",
  "requireRefereeObserver",
] as const;

function assertNullableNonNegative(value: number | null | undefined, field: string): void {
  if (value == null) return;
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${field} doit être un entier positif ou nul`);
  }
}

function validateUpdate(values: UpdateCompetitionMatchProtocolInput): void {
  assertNullableNonNegative(values.preMatchSigningDeadlineMinutes, "preMatchSigningDeadlineMinutes");
  assertNullableNonNegative(values.maxBenchPlayers, "maxBenchPlayers");
  assertNullableNonNegative(values.maxSubstitutions, "maxSubstitutions");
  assertNullableNonNegative(values.requiredAssistantReferees, "requiredAssistantReferees");
  if (values.requiredAssistantReferees != null && values.requiredAssistantReferees > 4) {
    throw new Error("requiredAssistantReferees ne peut pas dépasser 4");
  }
  for (const field of BOOLEAN_FIELDS) {
    const value = values[field];
    if (value !== undefined && typeof value !== "boolean") {
      throw new Error(`${field} doit être un booléen`);
    }
  }
}

function toValue(row: CompetitionMatchProtocol | null, seasonId: string): CompetitionMatchProtocolValue {
  if (!row) {
    return {
      seasonId,
      ...LEGACY_DEFAULTS,
      version: 0,
      updatedBy: null,
      updatedAt: null,
    };
  }
  return {
    seasonId: row.seasonId,
    preMatchSigningDeadlineMinutes: row.preMatchSigningDeadlineMinutes ?? null,
    maxBenchPlayers: row.maxBenchPlayers ?? null,
    maxSubstitutions: row.maxSubstitutions ?? null,
    requireHomeSignature: Boolean(row.requireHomeSignature),
    requireAwaySignature: Boolean(row.requireAwaySignature),
    requireRefereeSignature: Boolean(row.requireRefereeSignature),
    requireCenterReferee: Boolean(row.requireCenterReferee),
    requiredAssistantReferees: row.requiredAssistantReferees,
    requireFourthOfficial: Boolean(row.requireFourthOfficial),
    requireMatchDelegate: Boolean(row.requireMatchDelegate),
    requireRefereeObserver: Boolean(row.requireRefereeObserver),
    version: row.version,
    updatedBy: row.updatedBy ?? null,
    updatedAt: row.updatedAt ?? null,
  };
}

export class CompetitionMatchProtocolService {
  constructor(private readonly clubLineup: ClubLineupReadPort = createClubLineupAdapter()) {}

  async getForSeason(seasonId: string): Promise<CompetitionMatchProtocolValue> {
    const ds = await getDataSource();
    const row = await ds.getRepository(CompetitionMatchProtocol).findOne({ where: { seasonId } });
    return toValue(row, seasonId);
  }

  async updateForSeason(
    seasonId: string,
    values: UpdateCompetitionMatchProtocolInput,
    actorUserId: string,
  ): Promise<CompetitionMatchProtocolValue> {
    validateUpdate(values);

    const ds = await getDataSource();
    await ds.transaction(async (manager) => {
      const repo = manager.getRepository(CompetitionMatchProtocol);
      const current = await repo.findOne({ where: { seasonId } });
      const row =
        current ??
        repo.create({
          seasonId,
          ...LEGACY_DEFAULTS,
          version: 1,
          updatedBy: actorUserId,
        });
      Object.assign(row, values);
      row.version = current ? current.version + 1 : 1;
      row.updatedBy = actorUserId;
      await repo.save(row);
    });
    return this.getForSeason(seasonId);
  }

  async getSeasonIdForMatch(matchId: string, manager?: EntityManager): Promise<string | null> {
    const ds = await getDataSource();
    const em = manager ?? ds.manager;
    const match = await em.getRepository(Match).findOne({ where: { id: matchId } });
    if (!match) throw new Error("Match introuvable");
    const matchday = await em.getRepository(Matchday).findOne({ where: { id: match.journeeId } });
    return matchday?.seasonId ?? null;
  }

  async getForMatch(matchId: string, manager?: EntityManager): Promise<CompetitionMatchProtocolValue> {
    const ds = await getDataSource();
    const em = manager ?? ds.manager;
    const seasonId = await this.getSeasonIdForMatch(matchId, em);
    if (!seasonId) return toValue(null, "");
    const row = await em.getRepository(CompetitionMatchProtocol).findOne({ where: { seasonId } });
    return toValue(row, seasonId);
  }

  requiredSignatureRoles(protocol: CompetitionMatchProtocolValue): ActorRole[] {
    const roles: ActorRole[] = [];
    if (protocol.requireHomeSignature) roles.push("TEAM_HOME");
    if (protocol.requireAwaySignature) roles.push("TEAM_AWAY");
    if (protocol.requireRefereeSignature) roles.push("REFEREE");
    return roles;
  }

  async assertSubstitutionAllowed(matchId: string, teamId: string): Promise<void> {
    const protocol = await this.getForMatch(matchId);
    if (protocol.version === 0 || protocol.maxSubstitutions == null) return;

    const ds = await getDataSource();
    const count = await ds.getRepository(Substitution).count({
      where: { matchId, teamId, cancelledAt: IsNull() },
    });
    if (count >= protocol.maxSubstitutions) {
      throw new Error(`Nombre maximal de remplacements atteint (${protocol.maxSubstitutions})`);
    }
  }

  async validatePreMatch(sheetId: number, matchId: string, now = new Date()): Promise<void> {
    const ds = await getDataSource();
    const protocol = await this.getForMatch(matchId);
    if (protocol.version === 0) return;

    const match = await ds.getRepository(Match).findOne({ where: { id: matchId } });
    if (!match) throw new Error("Match introuvable");

    if (protocol.preMatchSigningDeadlineMinutes != null) {
      if (!match.date) throw new Error("Le match doit avoir une date pour appliquer la deadline pré-match");
      const cutoff = new Date(match.date.getTime() - protocol.preMatchSigningDeadlineMinutes * 60_000);
      if (now.getTime() > cutoff.getTime()) {
        throw new Error(
          `La deadline pré-match (${protocol.preMatchSigningDeadlineMinutes} min avant le coup d'envoi) est dépassée`,
        );
      }
    }

    if (protocol.maxBenchPlayers != null) {
      for (const teamId of [match.equipeHome, match.equipeAway]) {
        const lineup = await this.clubLineup.findByMatchAndTeam(matchId, teamId);
        const benchCount = lineup.filter((entry) => entry.role === "SUBSTITUTE").length;
        if (benchCount > protocol.maxBenchPlayers) {
          throw new Error(
            `Le banc de l'équipe ${teamId} dépasse la limite autorisée (${protocol.maxBenchPlayers})`,
          );
        }
      }
    }

    const requiredSignatureRoles = this.requiredSignatureRoles(protocol);
    if (requiredSignatureRoles.length > 0) {
      const signatures = await ds.getRepository(Signature).find({ where: { sheetId, phase: "PRE_MATCH" } });
      const present = new Set(signatures.map((signature) => signature.actorRole));
      const missing = requiredSignatureRoles.filter((role) => !present.has(role));
      if (missing.length > 0) {
        throw new Error(`Signatures pré-match manquantes : ${missing.join(", ")}`);
      }
    }

    const requiredOfficials = new Map<MatchOfficialAssignmentRole, number>();
    if (protocol.requireCenterReferee) requiredOfficials.set("CENTER_REFEREE", 1);
    if (protocol.requiredAssistantReferees > 0) {
      requiredOfficials.set("ASSISTANT_REFEREE", protocol.requiredAssistantReferees);
    }
    if (protocol.requireFourthOfficial) requiredOfficials.set("FOURTH_OFFICIAL", 1);
    if (protocol.requireMatchDelegate) requiredOfficials.set("MATCH_DELEGATE", 1);
    if (protocol.requireRefereeObserver) requiredOfficials.set("REFEREE_OBSERVER", 1);

    if (requiredOfficials.size > 0) {
      const assignments = await ds.getRepository(MatchOfficialAssignment).find({
        where: { matchId, status: "ACTIVE" },
      });
      for (const [role, requiredCount] of requiredOfficials) {
        const actualCount = assignments.filter((assignment) => assignment.role === role).length;
        if (actualCount < requiredCount) {
          throw new Error(`Officiels requis manquants : ${role} (${actualCount}/${requiredCount})`);
        }
      }
    }
  }
}
