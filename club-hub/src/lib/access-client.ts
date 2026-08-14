/**
 * Sous-ensemble client-safe de lib/access.ts — aucune dépendance serveur
 * (auth/DB), pour être importé depuis des Client Components (ex: la
 * sidebar admin) sans faire fuiter la vérification de session/TypeORM dans
 * le bundle client.
 */
export interface ClientAccess {
  isClubAdmin: boolean;
  permissions: "ALL" | string[];
}

export function canClient(access: ClientAccess, permission: string): boolean {
  if (access.isClubAdmin || access.permissions === "ALL") return true;
  return access.permissions.includes(permission);
}
