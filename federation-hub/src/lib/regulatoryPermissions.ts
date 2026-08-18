import { randomUUID } from "node:crypto";
import type { DataSource, EntityManager } from "typeorm";
import type { SsoUser } from "./ssoSession";

export const REGULATORY_PERMISSIONS = [
  "club_license.view", "club_license.review", "club_license.approve", "club_license.reject",
  "person_license.view", "person_license.review", "person_license.approve", "person_license.suspend",
  "player_registration.view", "player_registration.review", "player_registration.approve",
  "contract.view", "contract.review", "contract.approve",
  "competition_registration.view", "competition_registration.review", "competition_registration.approve",
  "transfer.view", "transfer.homologate", "transfer_window.manage", "eligibility.view", "eligibility.override",
  "legal_case.view", "legal_case.manage", "legal_case.decide",
  "discipline.view", "discipline.manage", "discipline.decide",
  "appeal.view", "appeal.manage", "appeal.decide",
  "financial_compliance.view", "financial_compliance.review",
  "stadium_license.view", "stadium_license.review",
  "coach_license.view", "coach_license.review",
  "medical_eligibility.view", "medical_eligibility.review",
  "governance.view", "governance.review",
  "agent.view", "agent.manage",
  "season_cycle.view", "season_cycle.manage",
  "sanction.view", "sanction.manage",
  "commission.view", "commission.manage", "commission.decide",
  "insurance.view", "insurance.review",
  "grant.view", "grant.manage", "grant.review",
  "broadcasting.view", "broadcasting.manage",
  "training_compensation.view", "training_compensation.manage", "training_compensation.decide",
  "solidarity.view", "solidarity.manage", "solidarity.decide",
  "document_compliance.view", "document_compliance.review",
  "national_team.view", "national_team.manage",
  "regulatory_policy.view", "regulatory_policy.manage",
  "regulatory_sla.view", "regulatory_sla.manage",
] as const;
export type RegulatoryPermission = (typeof REGULATORY_PERMISSIONS)[number];

type Source = DataSource | EntityManager;
const isPlatform = (session: SsoUser) => session.role === "SUPERADMIN" || session.role === "PLATFORM_SUPERADMIN";

export class RegulatoryPermissionError extends Error {
  constructor(public readonly permission: RegulatoryPermission) {
    super(`Permission réglementaire requise : ${permission}`);
    this.name = "RegulatoryPermissionError";
  }
}

/**
 * FED-011 : mode de migration vers une whitelist réglementaire complète.
 *   - LEGACY (défaut) : comportement historique — un compte sans ligne
 *     configurée garde tous ses droits, un compte avec des lignes passe en
 *     liste blanche stricte.
 *   - WARN : évalue comme si ENFORCE était déjà actif (aucune ligne = refus)
 *     mais n'empêche jamais l'action — seul un signal `shouldWarn` remonte,
 *     à charge de l'appelant de le journaliser, pour mesurer l'impact avant
 *     de basculer réellement en ENFORCE.
 *   - ENFORCE : la whitelist stricte s'applique à tous les comptes, y
 *     compris ceux sans aucune ligne.
 */
export const REGULATORY_PERMISSION_MODES = ["LEGACY", "WARN", "ENFORCE"] as const;
export type RegulatoryPermissionMode = (typeof REGULATORY_PERMISSION_MODES)[number];

export function evaluateRegulatoryPermission(mode: RegulatoryPermissionMode, hasAnyRows: boolean, matches: boolean): { allowed: boolean; shouldWarn: boolean } {
  if (mode === "LEGACY") return { allowed: !hasAnyRows || matches, shouldWarn: false };
  const strictlyAllowed = hasAnyRows && matches;
  if (mode === "ENFORCE") return { allowed: strictlyAllowed, shouldWarn: false };
  return { allowed: true, shouldWarn: !strictlyAllowed };
}

export async function getRegulatoryPermissionMode(source: Source): Promise<RegulatoryPermissionMode> {
  const rows = await source.query("SELECT mode FROM regulatory_permission_mode_settings WHERE id = 'GLOBAL' LIMIT 1") as Array<{ mode: RegulatoryPermissionMode }>;
  return rows[0]?.mode ?? "LEGACY";
}

export async function setRegulatoryPermissionMode(source: DataSource, actor: SsoUser, mode: unknown): Promise<RegulatoryPermissionMode> {
  if (!isPlatform(actor)) throw new RegulatoryPermissionError("season_cycle.manage");
  if (typeof mode !== "string" || !(REGULATORY_PERMISSION_MODES as readonly string[]).includes(mode)) throw new Error("Mode de permission réglementaire invalide");
  await source.query(
    "INSERT INTO regulatory_permission_mode_settings (id, mode, updated_by) VALUES ('GLOBAL', ?, ?) ON DUPLICATE KEY UPDATE mode = VALUES(mode), updated_by = VALUES(updated_by)",
    [mode, actor.id],
  );
  return mode as RegulatoryPermissionMode;
}

async function recordRegulatoryPermissionWarning(source: Source, userId: string, permission: RegulatoryPermission, pathname?: string | null): Promise<void> {
  await source.query(
    "INSERT INTO regulatory_permission_warnings (id, user_id, permission, pathname) VALUES (?, ?, ?, ?)",
    [randomUUID(), userId, permission, pathname ?? null],
  );
}

export async function hasRegulatoryPermission(source: Source, session: SsoUser, permission: RegulatoryPermission, pathname?: string | null): Promise<boolean> {
  if (isPlatform(session)) return true;
  const mode = await getRegulatoryPermissionMode(source);
  const rows = await source.query("SELECT permission FROM regulatory_user_permissions WHERE user_id = ?", [session.id]) as Array<{ permission: string }>;
  const { allowed, shouldWarn } = evaluateRegulatoryPermission(mode, rows.length > 0, rows.some(row => row.permission === permission));
  if (shouldWarn) await recordRegulatoryPermissionWarning(source, session.id, permission, pathname);
  return allowed;
}

export async function assertRegulatoryPermission(source: Source, session: SsoUser, permission: RegulatoryPermission, pathname?: string | null): Promise<void> {
  if (!await hasRegulatoryPermission(source, session, permission, pathname)) throw new RegulatoryPermissionError(permission);
}

/** FED-011 : dernières décisions qui auraient été refusées en ENFORCE, journalisées sans blocage tant que le mode reste WARN — sert à mesurer l'impact avant bascule. */
export async function listRegulatoryPermissionWarnings(source: Source, limit = 200): Promise<Array<{ id: string; userId: string; permission: string; pathname: string | null; occurredAt: Date | string }>> {
  const rows = await source.query(
    "SELECT id, user_id, permission, pathname, occurred_at FROM regulatory_permission_warnings ORDER BY occurred_at DESC LIMIT ?",
    [limit],
  ) as Array<{ id: string; user_id: string; permission: string; pathname: string | null; occurred_at: Date | string }>;
  return rows.map(row => ({ id: row.id, userId: row.user_id, permission: row.permission, pathname: row.pathname, occurredAt: row.occurred_at }));
}

export async function listRegulatoryPermissions(source: Source, userId: string): Promise<string[]> {
  const rows = await source.query("SELECT permission FROM regulatory_user_permissions WHERE user_id = ? ORDER BY permission", [userId]) as Array<{ permission: string }>;
  return rows.map(row => row.permission);
}

export async function replaceRegulatoryPermissions(source: DataSource, actor: SsoUser, userId: string, permissions: string[]): Promise<string[]> {
  if (!isPlatform(actor)) throw new RegulatoryPermissionError("season_cycle.manage");
  const unique = [...new Set(permissions)];
  const invalid = unique.filter(value => !(REGULATORY_PERMISSIONS as readonly string[]).includes(value));
  if (invalid.length) throw new Error(`Permissions inconnues : ${invalid.join(", ")}`);
  await source.transaction(async manager => {
    await manager.query("DELETE FROM regulatory_user_permissions WHERE user_id = ?", [userId]);
    for (const permission of unique) await manager.query("INSERT INTO regulatory_user_permissions (user_id, permission, granted_by) VALUES (?, ?, ?)", [userId, permission, actor.id]);
  });
  return listRegulatoryPermissions(source, userId);
}

/** Resolve la permission requise pour les API migration-v2. Les pages et les API hors domaine réglementaire ne sont pas affectées. */
export function resolveRegulatoryPermission(pathname: string, method: string): RegulatoryPermission | null {
  if (!pathname.startsWith("/api/admin/")) return null;
  const write = method !== "GET" && method !== "HEAD";
  const has = (value: string) => pathname.includes(value);
  const action = pathname.split("/").filter(Boolean).at(-1) ?? "";

  if (has("/regulatory-permissions")) return null;
  if (has("/club-licensing")) {
    if (!write) return "club_license.view";
    if (action === "approve") return "club_license.approve";
    if (action === "reject") return "club_license.reject";
    return "club_license.review";
  }
  if (has("/licenses")) {
    if (!write) return "person_license.view";
    if (action === "approve") return "person_license.approve";
    if (action === "suspend") return "person_license.suspend";
    return "person_license.review";
  }
  if (has("/registrations")) {
    if (!write) return "player_registration.view";
    if (action === "approve") return "player_registration.approve";
    return "player_registration.review";
  }
  if (has("/staff-contracts") || has("/contracts")) return write ? (action === "approve" ? "contract.approve" : "contract.review") : "contract.view";
  if (has("/competition-entries")) return write ? (action === "approve" ? "competition_registration.approve" : "competition_registration.review") : "competition_registration.view";
  if (has("/player-transfers")) return write ? "transfer.homologate" : "transfer.view";
  if (has("/transfer-windows")) return "transfer_window.manage";
  if (has("/eligibility")) return write ? "eligibility.override" : "eligibility.view";
  if (has("/legal-cases")) return write ? (action === "decision" || action === "decide" ? "legal_case.decide" : "legal_case.manage") : "legal_case.view";
  if (has("/discipline")) return write ? (action === "decision" || action === "decide" ? "discipline.decide" : "discipline.manage") : "discipline.view";
  if (has("/appeals")) return write ? (action === "decision" || action === "decide" ? "appeal.decide" : "appeal.manage") : "appeal.view";
  if (has("/financial-compliance")) return write ? "financial_compliance.review" : "financial_compliance.view";
  if (has("/stadium-licensing")) return write ? "stadium_license.review" : "stadium_license.view";
  if (has("/coach-licenses")) return write ? "coach_license.review" : "coach_license.view";
  if (has("/medical-eligibility")) return write ? "medical_eligibility.review" : "medical_eligibility.view";
  if (has("/board-mandates")) return write ? "governance.review" : "governance.view";
  if (has("/agents") || has("/agreements")) return write ? "agent.manage" : "agent.view";
  if (has("/season-cycles")) return write ? "season_cycle.manage" : "season_cycle.view";
  if (has("/sanctions")) return write ? "sanction.manage" : "sanction.view";

  if (has("/federal-operations/commissions")) {
    if (!write) return "commission.view";
    if (["decision", "decide", "sign", "notify"].includes(action)) return "commission.decide";
    return "commission.manage";
  }
  if (has("/federal-operations/insurance")) return write ? "insurance.review" : "insurance.view";
  if (has("/federal-operations/grants")) {
    if (!write) return "grant.view";
    return ["review", "approve", "reject", "payment"].includes(action) ? "grant.review" : "grant.manage";
  }
  if (has("/federal-operations/broadcasting")) return write ? "broadcasting.manage" : "broadcasting.view";
  if (has("/federal-operations/training-compensation")) {
    if (!write) return "training_compensation.view";
    return ["decision", "decide", "settle-beneficiary"].includes(action) ? "training_compensation.decide" : "training_compensation.manage";
  }
  if (has("/federal-operations/solidarity")) {
    if (!write) return "solidarity.view";
    return ["decision", "decide", "settle-beneficiary"].includes(action) ? "solidarity.decide" : "solidarity.manage";
  }
  if (has("/federal-operations/documents")) return write ? "document_compliance.review" : "document_compliance.view";
  if (has("/federal-operations/national-teams")) return write ? "national_team.manage" : "national_team.view";
  if (has("/regulatory-policy-center")) return write ? "regulatory_policy.manage" : "regulatory_policy.view";
  if (has("/regulatory-sla")) return write ? "regulatory_sla.manage" : "regulatory_sla.view";
  return null;
}
