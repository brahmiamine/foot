import { getDataSource } from "@/lib/db";
import type {
  ClubPermissionScope,
  ClubPermissionScopeReadPort,
  ClubPermissionScopeRequest,
} from "../../../../packages/domain-contracts/src/club-access";

interface ClubRoleRow {
  permissions: string;
  isGlobal: number | boolean;
  category: string | null;
}

/**
 * Transitional shared-database adapter for the Club-owned RBAC projection.
 * Match Operations consumes the port and never depends on cms_roles schema
 * outside this adapter.
 */
export class SharedDatabaseClubPermissionScopeAdapter implements ClubPermissionScopeReadPort {
  async getPermissionScope(input: ClubPermissionScopeRequest): Promise<ClubPermissionScope> {
    const dataSource = await getDataSource();
    const rows = (await dataSource.query(
      `SELECT r.permissions, r.is_global AS isGlobal, ur.category
       FROM cms_user_roles ur
       INNER JOIN cms_roles r ON r.id = ur.role_id AND r.team_id = ur.team_id
       WHERE ur.team_id = ? AND ur.user_id = ?`,
      [input.teamId, input.userId],
    )) as ClubRoleRow[];

    const categories = new Set<string>();
    let matched = false;

    for (const row of rows) {
      let permissions: string[] = [];
      try {
        const parsed = JSON.parse(row.permissions);
        permissions = Array.isArray(parsed)
          ? parsed.filter((value): value is string => typeof value === "string")
          : [];
      } catch {
        permissions = [];
      }

      if (!permissions.includes(input.permission)) continue;
      matched = true;
      if (Boolean(row.isGlobal)) return "ALL";
      if (row.category) categories.add(row.category);
    }

    return matched ? Array.from(categories) : null;
  }
}
