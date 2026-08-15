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

export async function hasRegulatoryPermission(source: Source, session: SsoUser, permission: RegulatoryPermission): Promise<boolean> {
  if (isPlatform(session)) return true;
  const rows = await source.query("SELECT permission FROM regulatory_user_permissions WHERE user_id = ?", [session.id]) as Array<{ permission: string }>;
  if (rows.length === 0) return true;
  return rows.some(row => row.permission === permission);
}

export async function assertRegulatoryPermission(source: Source, session: SsoUser, permission: RegulatoryPermission): Promise<void> {
  if (!await hasRegulatoryPermission(source, session, permission)) throw new RegulatoryPermissionError(permission);
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
  return null;
}
