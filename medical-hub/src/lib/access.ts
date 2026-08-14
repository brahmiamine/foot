import { getDataSource } from "./database";
import { UserRole } from "@/entities/UserRole";
import { auth } from "./auth";
import type { AgeCategory } from "@/types/categories";

export interface UserAccess {
  userId: string;
  teamId: string;
  isClubAdmin: boolean;
  permissions: "ALL" | Set<string>;
  categories: "ALL" | AgeCategory[];
}

/**
 * Réutilise exactement le RBAC déjà en place côté club-hub
 * (cms_roles/cms_user_roles, voir club-hub/src/lib/access.ts et
 * services/RoleService.ts) : staff-hub ne le redéfinit pas, il le relit.
 * `User.role === "ADMIN"` (président/super-admin du club) garde un accès
 * complet ; un compte `OBSERVATEUR` est scopé par les rôles qui lui ont été
 * attribués dans club-hub.
 */
export async function getUserAccess(): Promise<UserAccess> {
  const session = await auth();
  if (!session) throw new Error("Non authentifié");

  const { id: userId, teamId, role } = session.user;

  if (role === "ADMIN") {
    return { userId, teamId, isClubAdmin: true, permissions: "ALL", categories: "ALL" };
  }

  const ds = await getDataSource();
  const assignments = await ds.getRepository(UserRole).find({ where: { teamId, userId }, relations: ["role"] });

  let isAllCategories = false;
  const permissions = new Set<string>();
  const categories = new Set<AgeCategory>();

  for (const assignment of assignments) {
    const r = assignment.role;
    if (!r) continue;
    try {
      const parsed = JSON.parse(r.permissions);
      if (Array.isArray(parsed)) {
        for (const key of parsed) if (typeof key === "string") permissions.add(key);
      }
    } catch {
      // ignore un JSON invalide plutôt que de faire échouer toute la résolution d'accès
    }
    if (r.isGlobal) isAllCategories = true;
    else if (assignment.category) categories.add(assignment.category);
  }

  return {
    userId,
    teamId,
    isClubAdmin: false,
    permissions,
    categories: isAllCategories ? "ALL" : Array.from(categories),
  };
}

export function can(access: UserAccess, permission: string): boolean {
  if (access.permissions === "ALL") return true;
  return access.permissions.has(permission);
}

export function categoryAllowed(access: UserAccess, category: AgeCategory): boolean {
  if (access.categories === "ALL") return true;
  return access.categories.includes(category);
}

/** Lève une erreur si la permission n'est pas accordée — pour les Server Actions. */
export function requirePermission(access: UserAccess, permission: string): void {
  if (!can(access, permission)) {
    throw new Error("Action non autorisée : permission manquante");
  }
}
