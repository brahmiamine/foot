import { randomUUID } from "node:crypto";
import type { DataSource, EntityManager } from "typeorm";

export class ClubFederalOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClubFederalOperationError";
  }
}

type Source = DataSource | EntityManager;
export type ClubFederalAuditActor = {
  userId: string;
  role: string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

type Scope = { federationId: string; leagueId: string | null; saisonId: string | null };

function requiredText(value: unknown, label: string, max = 191): string {
  if (typeof value !== "string" || !value.trim()) throw new ClubFederalOperationError(`${label} requis`);
  const normalized = value.trim();
  if (normalized.length > max) throw new ClubFederalOperationError(`${label} trop long`);
  return normalized;
}

function positiveAmount(value: unknown, label: string): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) throw new ClubFederalOperationError(`${label} invalide`);
  return amount;
}

function safeDocumentUrl(value: unknown): string {
  const url = requiredText(value, "Document", 5000);
  if (!(url.startsWith("https://") || url.startsWith("/"))) {
    throw new ClubFederalOperationError("Le document doit utiliser HTTPS ou un chemin interne");
  }
  return url;
}

async function recordAudit(source: Source, actor: ClubFederalAuditActor, domain: string, entityId: string, action: string, afterValue: unknown) {
  await source.query(
    `INSERT INTO federal_operation_audit
      (id, domain, entity_id, action, actor_user_id, actor_role, after_value, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [randomUUID(), domain, entityId, action, actor.userId, actor.role, JSON.stringify(afterValue ?? null), actor.ipAddress ?? null, actor.userAgent ?? null],
  );
}

export async function getClubFederalScope(teamId: string, source: Source): Promise<Scope> {
  const affiliations = await source.query(
    `SELECT federation_id, league_id, saison_id
       FROM team_affiliations
      WHERE team_id = ? AND status = 'ACTIVE'
      ORDER BY start_date DESC, created_at DESC
      LIMIT 1`,
    [teamId],
  ) as Array<{ federation_id: string; league_id: string | null; saison_id: string | null }>;
  if (affiliations[0]) {
    return { federationId: affiliations[0].federation_id, leagueId: affiliations[0].league_id, saisonId: affiliations[0].saison_id };
  }
  const teams = await source.query(`SELECT federation_id FROM teams WHERE id = ? LIMIT 1`, [teamId]) as Array<{ federation_id: string | null }>;
  if (!teams[0]?.federation_id) throw new ClubFederalOperationError("Le club ne possède aucune affiliation fédérale active");
  return { federationId: teams[0].federation_id, leagueId: null, saisonId: null };
}

async function assertCampaignWindow(source: Source, seasonId: string, fieldPrefix: "insurance" | "grant_application" | "document_compliance") {
  const rows = await source.query(
    `SELECT status, ${fieldPrefix}_open_at AS opens_at, ${fieldPrefix}_close_at AS closes_at
       FROM season_regulatory_cycles WHERE season_id = ? LIMIT 1`,
    [seasonId],
  ) as Array<{ status: string; opens_at: Date | string | null; closes_at: Date | string | null }>;
  const cycle = rows[0];
  if (!cycle) return;
  if (cycle.status !== "ACTIVE") throw new ClubFederalOperationError("La campagne réglementaire de cette saison n'est pas active");
  if (!cycle.opens_at || !cycle.closes_at) throw new ClubFederalOperationError("La fenêtre réglementaire n'est pas encore configurée");
  const now = Date.now();
  if (now < new Date(cycle.opens_at).getTime() || now > new Date(cycle.closes_at).getTime()) {
    throw new ClubFederalOperationError("La fenêtre réglementaire est fermée");
  }
}

export async function listClubFederalOperations(teamId: string, source: DataSource) {
  const scope = await getClubFederalScope(teamId, source);
  const leagueClause = scope.leagueId ? "AND (g.league_id IS NULL OR g.league_id = ?)" : "AND g.league_id IS NULL";
  const grantParams: unknown[] = [scope.federationId];
  if (scope.leagueId) grantParams.push(scope.leagueId);
  const documentLeagueClause = scope.leagueId ? "AND (r.league_id IS NULL OR r.league_id = ?)" : "AND r.league_id IS NULL";
  const documentParams: unknown[] = [scope.federationId];
  if (scope.leagueId) documentParams.push(scope.leagueId);

  const [insurance, grants, grantApplications, requirements, submissions, broadcasting, trainingCompensation, solidarity, nationalCallups] = await Promise.all([
    source.query(`SELECT id, season_id, policy_number, provider, coverage_type, starts_at, expires_at, status, document_url, review_comment, created_at FROM club_insurance_policies WHERE club_id = ? ORDER BY created_at DESC`, [teamId]),
    source.query(`SELECT g.id, g.season_id, g.code, g.name, g.description, g.total_budget, g.currency, g.opens_at, g.closes_at, g.status FROM federation_grants g WHERE g.federation_id = ? ${leagueClause} AND g.status = 'OPEN' AND CURRENT_TIMESTAMP BETWEEN g.opens_at AND g.closes_at ORDER BY g.closes_at`, grantParams),
    source.query(`SELECT a.*, g.code AS grant_code, g.name AS grant_name, g.currency FROM grant_applications a JOIN federation_grants g ON g.id = a.grant_id WHERE a.club_id = ? ORDER BY a.created_at DESC`, [teamId]),
    source.query(`SELECT r.id, r.season_id, r.domain, r.code, r.name, r.mandatory, r.valid_days, r.instructions FROM regulatory_document_requirements r WHERE r.federation_id = ? ${documentLeagueClause} AND r.active = 1 AND r.applies_to IN ('CLUB','BOTH') ORDER BY r.domain, r.code`, documentParams),
    source.query(`SELECT s.*, r.code AS requirement_code, r.name AS requirement_name, r.domain FROM regulatory_document_submissions s JOIN regulatory_document_requirements r ON r.id = s.requirement_id WHERE s.club_id = ? ORDER BY s.submitted_at DESC`, [teamId]),
    source.query(`SELECT a.*, d.name AS distribution_name, d.season_id, d.currency FROM broadcasting_revenue_allocations a JOIN broadcasting_revenue_distributions d ON d.id = a.distribution_id WHERE a.club_id = ? ORDER BY a.created_at DESC`, [teamId]),
    source.query(`SELECT b.*, c.reference_number, c.player_id, c.currency, c.status AS case_status FROM training_compensation_beneficiaries b JOIN training_compensation_cases c ON c.id = b.case_id WHERE b.club_id = ? OR c.liable_club_id = ? ORDER BY c.created_at DESC`, [teamId, teamId]),
    source.query(`SELECT a.*, c.reference_number, c.player_id, c.currency, c.status AS contribution_status FROM solidarity_allocations a JOIN solidarity_contributions c ON c.id = a.contribution_id WHERE a.club_id = ? OR c.triggering_club_id = ? OR c.receiving_club_id = ? ORDER BY c.created_at DESC`, [teamId, teamId, teamId]),
    source.query(`SELECT c.*, t.name AS national_team_name, e.title AS event_title, e.starts_at AS event_starts_at FROM national_team_callups c JOIN national_teams t ON t.id = c.national_team_id LEFT JOIN national_team_events e ON e.id = c.event_id WHERE c.club_id = ? ORDER BY c.created_at DESC`, [teamId]),
  ]);

  return { scope, insurance, grants, grantApplications, requirements, submissions, broadcasting, trainingCompensation, solidarity, nationalCallups };
}

export async function createClubInsuranceDraft(teamId: string, actor: ClubFederalAuditActor, input: Record<string, unknown>, source: DataSource) {
  const scope = await getClubFederalScope(teamId, source);
  const seasonId = requiredText(input.seasonId, "Saison");
  await assertCampaignWindow(source, seasonId, "insurance");
  const policyNumber = requiredText(input.policyNumber, "Numéro de police", 120);
  const provider = requiredText(input.provider, "Assureur");
  const coverageType = requiredText(input.coverageType ?? "CLUB", "Couverture", 30);
  if (!["CLUB", "PLAYERS", "STAFF", "MATCHDAY", "OTHER"].includes(coverageType)) throw new ClubFederalOperationError("Type de couverture invalide");
  const startsAt = new Date(requiredText(input.startsAt, "Début de couverture"));
  const expiresAt = new Date(requiredText(input.expiresAt, "Fin de couverture"));
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(expiresAt.getTime()) || expiresAt <= startsAt) throw new ClubFederalOperationError("Période de couverture invalide");
  const id = randomUUID();
  await source.transaction(async manager => {
    await manager.query(
      `INSERT INTO club_insurance_policies
        (id, federation_id, league_id, season_id, club_id, policy_number, provider, coverage_type, starts_at, expires_at, document_url, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, scope.federationId, scope.leagueId, seasonId, teamId, policyNumber, provider, coverageType, startsAt, expiresAt, input.documentUrl ? safeDocumentUrl(input.documentUrl) : null, actor.userId],
    );
    await recordAudit(manager, actor, "INSURANCE", id, "CLUB_DRAFT_CREATED", { teamId, seasonId, policyNumber });
  });
  return { id, status: "DRAFT", policyNumber };
}

export async function submitClubInsurance(teamId: string, actor: ClubFederalAuditActor, id: string, source: DataSource) {
  const rows = await source.query(`SELECT id, season_id, status FROM club_insurance_policies WHERE id = ? AND club_id = ? LIMIT 1`, [id, teamId]) as Array<{ id: string; season_id: string; status: string }>;
  const policy = rows[0];
  if (!policy) throw new ClubFederalOperationError("Police d'assurance introuvable");
  if (policy.status !== "DRAFT") throw new ClubFederalOperationError("Seul un brouillon peut être soumis");
  await assertCampaignWindow(source, policy.season_id, "insurance");
  await source.transaction(async manager => {
    await manager.query(`UPDATE club_insurance_policies SET status = 'SUBMITTED', submitted_at = CURRENT_TIMESTAMP WHERE id = ? AND club_id = ? AND status = 'DRAFT'`, [id, teamId]);
    await recordAudit(manager, actor, "INSURANCE", id, "SUBMITTED_BY_CLUB", { teamId, status: "SUBMITTED" });
  });
  return { id, status: "SUBMITTED" };
}

export async function createClubGrantApplication(teamId: string, actor: ClubFederalAuditActor, input: Record<string, unknown>, source: DataSource) {
  const scope = await getClubFederalScope(teamId, source);
  const grantId = requiredText(input.grantId, "Programme de subvention");
  const grants = await source.query(
    `SELECT id, federation_id, league_id, season_id, total_budget, currency, status, opens_at, closes_at FROM federation_grants WHERE id = ? LIMIT 1`,
    [grantId],
  ) as Array<{ id: string; federation_id: string; league_id: string | null; season_id: string | null; total_budget: number | string; currency: string; status: string; opens_at: Date | string; closes_at: Date | string }>;
  const grant = grants[0];
  if (!grant || grant.federation_id !== scope.federationId || (grant.league_id && grant.league_id !== scope.leagueId)) throw new ClubFederalOperationError("Programme de subvention non accessible à ce club");
  if (grant.status !== "OPEN" || Date.now() < new Date(grant.opens_at).getTime() || Date.now() > new Date(grant.closes_at).getTime()) throw new ClubFederalOperationError("La campagne de subvention est fermée");
  if (grant.season_id) await assertCampaignWindow(source, grant.season_id, "grant_application");
  const requestedAmount = positiveAmount(input.requestedAmount, "Montant demandé");
  if (requestedAmount > Number(grant.total_budget)) throw new ClubFederalOperationError("Le montant demandé dépasse l'enveloppe du programme");
  const id = randomUUID();
  await source.transaction(async manager => {
    await manager.query(
      `INSERT INTO grant_applications (id, grant_id, club_id, requested_amount, purpose, budget, documents, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, grantId, teamId, requestedAmount, requiredText(input.purpose, "Objet", 10000), input.budget ? JSON.stringify(input.budget) : null, input.documents ? JSON.stringify(input.documents) : null, actor.userId],
    );
    await recordAudit(manager, actor, "GRANT_APPLICATION", id, "CLUB_DRAFT_CREATED", { teamId, grantId, requestedAmount });
  });
  return { id, grantId, requestedAmount, currency: grant.currency, status: "DRAFT" };
}

export async function submitClubGrantApplication(teamId: string, actor: ClubFederalAuditActor, id: string, source: DataSource) {
  const rows = await source.query(`SELECT a.id, a.status, g.status AS grant_status, g.season_id, g.opens_at, g.closes_at FROM grant_applications a JOIN federation_grants g ON g.id = a.grant_id WHERE a.id = ? AND a.club_id = ? LIMIT 1`, [id, teamId]) as Array<{ id: string; status: string; grant_status: string; season_id: string | null; opens_at: Date | string; closes_at: Date | string }>;
  const application = rows[0];
  if (!application) throw new ClubFederalOperationError("Demande de subvention introuvable");
  if (application.status !== "DRAFT") throw new ClubFederalOperationError("Seul un brouillon peut être soumis");
  if (application.grant_status !== "OPEN" || Date.now() < new Date(application.opens_at).getTime() || Date.now() > new Date(application.closes_at).getTime()) throw new ClubFederalOperationError("La campagne de subvention est fermée");
  if (application.season_id) await assertCampaignWindow(source, application.season_id, "grant_application");
  await source.transaction(async manager => {
    await manager.query(`UPDATE grant_applications SET status = 'SUBMITTED', submitted_at = CURRENT_TIMESTAMP WHERE id = ? AND club_id = ? AND status = 'DRAFT'`, [id, teamId]);
    await recordAudit(manager, actor, "GRANT_APPLICATION", id, "SUBMITTED_BY_CLUB", { teamId, status: "SUBMITTED" });
  });
  return { id, status: "SUBMITTED" };
}

export async function submitClubRegulatoryDocument(teamId: string, actor: ClubFederalAuditActor, input: Record<string, unknown>, source: DataSource) {
  const scope = await getClubFederalScope(teamId, source);
  const requirementId = requiredText(input.requirementId, "Exigence documentaire");
  const rows = await source.query(`SELECT id, federation_id, league_id, season_id, active, applies_to, valid_days FROM regulatory_document_requirements WHERE id = ? LIMIT 1`, [requirementId]) as Array<{ id: string; federation_id: string; league_id: string | null; season_id: string | null; active: number | boolean; applies_to: string; valid_days: number | null }>;
  const requirement = rows[0];
  if (!requirement || requirement.federation_id !== scope.federationId || (requirement.league_id && requirement.league_id !== scope.leagueId) || !Boolean(requirement.active) || !["CLUB", "BOTH"].includes(requirement.applies_to)) throw new ClubFederalOperationError("Exigence documentaire non accessible à ce club");
  if (requirement.season_id) await assertCampaignWindow(source, requirement.season_id, "document_compliance");
  const fileUrl = safeDocumentUrl(input.fileUrl);
  const versions = await source.query(`SELECT COALESCE(MAX(version), 0) AS version FROM regulatory_document_submissions WHERE requirement_id = ? AND related_entity_type = 'CLUB' AND related_entity_id = ?`, [requirementId, teamId]) as Array<{ version: number | string }>;
  const version = Number(versions[0]?.version ?? 0) + 1;
  const issuedAt = input.issuedAt ? new Date(String(input.issuedAt)) : null;
  let expiresAt = input.expiresAt ? new Date(String(input.expiresAt)) : null;
  if (issuedAt && Number.isNaN(issuedAt.getTime())) throw new ClubFederalOperationError("Date d'émission invalide");
  if (expiresAt && Number.isNaN(expiresAt.getTime())) throw new ClubFederalOperationError("Date d'expiration invalide");
  if (issuedAt && requirement.valid_days && !expiresAt) expiresAt = new Date(issuedAt.getTime() + requirement.valid_days * 86_400_000);
  const id = randomUUID();
  await source.transaction(async manager => {
    await manager.query(`UPDATE regulatory_document_submissions SET status = 'SUPERSEDED' WHERE requirement_id = ? AND related_entity_type = 'CLUB' AND related_entity_id = ? AND status NOT IN ('REJECTED','EXPIRED','SUPERSEDED')`, [requirementId, teamId]);
    await manager.query(
      `INSERT INTO regulatory_document_submissions
        (id, requirement_id, club_id, related_entity_type, related_entity_id, version, file_url, checksum, issued_at, expires_at, submitted_by)
       VALUES (?, ?, ?, 'CLUB', ?, ?, ?, ?, ?, ?, ?)`,
      [id, requirementId, teamId, teamId, version, fileUrl, typeof input.checksum === "string" ? input.checksum.slice(0, 128) : null, issuedAt, expiresAt, actor.userId],
    );
    await recordAudit(manager, actor, "DOCUMENT_SUBMISSION", id, "SUBMITTED_BY_CLUB", { teamId, requirementId, version, expiresAt });
  });
  return { id, requirementId, version, status: "SUBMITTED", expiresAt };
}
