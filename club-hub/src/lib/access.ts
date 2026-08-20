import { auth } from "./auth";
import { RoleService } from "@/services/RoleService";
import { AgeCategory } from "@/types/categories";
import type { ClientAccess } from "./access-client";

export interface UserAccess {
  userId: string;
  teamId: string;
  /** Rôle issu de la session signée, utilisable comme identité d'audit. */
  actorRole?: string;
  isClubAdmin: boolean;
  permissions: "ALL" | Set<string>;
  categories: "ALL" | AgeCategory[];
}

/**
 * Accès effectif de l'utilisateur connecté pour son club. `User.role ===
 * "ADMIN"` (président / super-admin du club) a toujours accès complet,
 * sans passer par le catalogue de rôles — c'est lui qui gère les rôles et
 * les comptes de son club. Les comptes `OBSERVATEUR` sont scopés par les
 * rôles qui leur ont été attribués (cms_user_roles).
 */
export async function getUserAccess(): Promise<UserAccess> {
  const session = await auth();
  if (!session?.user?.teamId) {
    throw new Error("Non authentifié");
  }

  const userId = session.user.id;
  const teamId = session.user.teamId;
  const actorRole = session.user.role;

  if (session.user.role === "ADMIN" || session.user.role === "CLUB_ADMIN") {
    return {
      userId,
      teamId,
      actorRole,
      isClubAdmin: true,
      permissions: "ALL",
      categories: "ALL",
    };
  }

  const roleService = new RoleService();
  const { permissions, categories } = await roleService.getEffectiveAccess(teamId, userId);

  return {
    userId,
    teamId,
    actorRole,
    isClubAdmin: false,
    permissions: new Set(permissions),
    categories,
  };
}

export function can(access: UserAccess, permission: string): boolean {
  if (access.permissions === "ALL") return true;
  if (access.permissions.has(permission)) return true;
  // CLUB-013 compatibility bridge for custom roles created before granular
  // medical permissions existed.
  return permission.startsWith("medical.") && access.permissions.has("medical.manage");
}

/** true si l'utilisateur peut voir/gérer une ressource de cette catégorie interne. */
export function categoryAllowed(access: UserAccess, category: AgeCategory | string): boolean {
  if (access.categories === "ALL") return true;
  return access.categories.includes(category as AgeCategory);
}

/** Catégories que l'utilisateur peut choisir à la création d'une ressource. */
export function selectableCategories(access: UserAccess, allCategories: readonly AgeCategory[]): readonly AgeCategory[] {
  if (access.categories === "ALL") return allCategories;
  return access.categories;
}

/** Lève une erreur si la permission n'est pas accordée — pour les server actions. */
export function requirePermission(access: UserAccess, permission: string): void {
  if (!can(access, permission)) {
    throw new Error("Action non autorisée : permission manquante");
  }
}

/** Lève une erreur si la catégorie de la ressource n'est pas dans le périmètre de l'utilisateur. */
export function requireCategory(access: UserAccess, category: AgeCategory | string): void {
  if (!categoryAllowed(access, category)) {
    throw new Error("Action non autorisée : catégorie hors de votre périmètre");
  }
}

/** Sous-ensemble sérialisable de UserAccess, pour passer la portée de l'utilisateur à des composants client (ex: la sidebar). */
export function toClientAccess(access: UserAccess): ClientAccess {
  return {
    isClubAdmin: access.isClubAdmin,
    permissions: access.permissions === "ALL" ? "ALL" : Array.from(access.permissions),
  };
}

export type { ClientAccess } from "./access-client";
export { canClient } from "./access-client";