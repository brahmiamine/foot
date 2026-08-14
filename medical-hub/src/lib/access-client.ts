/**
 * Sous-ensemble client-safe de lib/access.ts — même pattern que
 * club-hub/src/lib/access-client.ts, pour filtrer la sidebar sans faire
 * fuiter la vérification de session/TypeORM dans le bundle client.
 */
export interface ClientAccess {
  isClubAdmin: boolean;
  permissions: "ALL" | string[];
}

export function canClient(access: ClientAccess, permission?: string): boolean {
  if (!permission) return true;
  if (access.isClubAdmin || access.permissions === "ALL") return true;
  return access.permissions.includes(permission);
}

export function toClientAccess(access: { isClubAdmin: boolean; permissions: "ALL" | Set<string> }): ClientAccess {
  return {
    isClubAdmin: access.isClubAdmin,
    permissions: access.permissions === "ALL" ? "ALL" : Array.from(access.permissions),
  };
}
