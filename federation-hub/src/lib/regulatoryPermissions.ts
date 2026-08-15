import type { DataSource, EntityManager } from "typeorm";
import { canAccessPlatform } from "./adminAuth";
import type { SsoUser } from "./ssoSession";

export const REGULATORY_PERMISSIONS = [
  "club_license.view", "club_license.review", "club_license.approve", "club_license.reject",
  "person_license.view", "person_license.review", "person_license.approve", "person_license.suspend",
  "contract.view", "contract.review", "contract.approve",
  "competition_registration.view", "competition_registration.review", "competition_registration.approve",
  "transfer_window.manage", "eligibility.view", "eligibility.override",
  "legal_case.view", "legal_case.manage", "legal_case.decide",
  "discipline.view", "discipline.manage", "discipline.decide",
  "appeal.view", "appeal.manage", "appeal.decide",
  "financial_compliance.view", "financial_compliance.review",
  "stadium_license.view", "stadium_license.review",
  "coach_license.view", "coach_license.review",
  "agent.view", "agent.manage",
  "season_cycle.view", "season_cycle.manage",
  "sanction.view", "sanction.manage",
] as const;
export type RegulatoryPermission = (typeof REGULATORY_PERMISSIONS)[number];

type Source = DataSource | EntityManager;

export class RegulatoryPermissionError extends Error {
  constructor(public readonly permission: RegulatoryPermission) {
    super(`Permission réglementaire requise : ${permission}`);
    this.name = "RegulatoryPermissionError";
  }
}

/**
 * PLATFORM_SUPERADMIN reste global. Pour les autres administrateurs, l'absence
 * totale de lignes conserve le comportement historique ; dès qu'une permission
 * est configurée pour le compte, le domaine réglementaire passe en liste blanche.
 */
export async function hasRegulatoryPermission(source: Source, session: SsoUser, permission: RegulatoryPermission): Promise<boolean> {
  if (canAccessPlatform(session)) return true;
  const rows = await source.query(
    "SELECT permission FROM regulatory_user_permissions WHERE user_id = ?",
    [session.id],
  ) as Array<{ permission: string }>;
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
  if (!canAccessPlatform(actor)) throw new RegulatoryPermissionError("season_cycle.manage");
  const unique = [...new Set(permissions)];
  const invalid = unique.filter(value => !(REGULATORY_PERMISSIONS as readonly string[]).includes(value));
  if (invalid.length) throw new Error(`Permissions inconnues : ${invalid.join(", ")}`);
  await source.transaction(async manager => {
    await manager.query("DELETE FROM regulatory_user_permissions WHERE user_id = ?", [userId]);
    for (const permission of unique) {
      await manager.query("INSERT INTO regulatory_user_permissions (user_id, permission, granted_by) VALUES (?, ?, ?)", [userId, permission, actor.id]);
    }
  });
  return listRegulatoryPermissions(source, userId);
}
