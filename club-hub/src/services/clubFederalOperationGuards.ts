import type { DataSource } from "typeorm";
import { ClubFederalOperationError } from "./ClubFederalOperationsService";

export type ActiveClubFederalScope = {
  federationId: string;
  leagueId: string | null;
};

export async function assertActiveClubFederalAffiliation(teamId: string, source: DataSource): Promise<ActiveClubFederalScope> {
  const rows = await source.query(
    `SELECT federation_id, league_id
       FROM team_affiliations
      WHERE team_id = ? AND status = 'ACTIVE'
      ORDER BY start_date DESC, created_at DESC
      LIMIT 1`,
    [teamId],
  ) as Array<{ federation_id: string; league_id: string | null }>;
  const row = rows[0];
  if (!row) throw new ClubFederalOperationError("Le club doit disposer d'une affiliation fédérale active pour modifier un dossier réglementaire");
  return { federationId: row.federation_id, leagueId: row.league_id };
}

export async function assertClubSeasonInScope(
  teamId: string,
  seasonId: string,
  source: DataSource,
): Promise<ActiveClubFederalScope> {
  if (!seasonId.trim()) throw new ClubFederalOperationError("Saison requise");
  const scope = await assertActiveClubFederalAffiliation(teamId, source);
  const rows = await source.query(
    `SELECT s.id, s.league_id, l.federation_id
       FROM saisons s
       LEFT JOIN ligues l ON l.id = s.league_id
      WHERE s.id = ?
      LIMIT 1`,
    [seasonId.trim()],
  ) as Array<{ id: string; league_id: string | null; federation_id: string | null }>;
  const season = rows[0];
  if (!season) throw new ClubFederalOperationError("Saison introuvable");
  if (!season.league_id || !season.federation_id) throw new ClubFederalOperationError("La saison n'est pas rattachée à une ligue fédérale");
  if (season.federation_id !== scope.federationId || (scope.leagueId && season.league_id !== scope.leagueId)) {
    throw new ClubFederalOperationError("Saison hors du périmètre réglementaire du club");
  }
  return scope;
}
