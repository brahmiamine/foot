/**
 * Modèle de rôles cible Fédération / Ligue / Club (voir migration.md §7-9)
 * et compatibilité avec les rôles historiques de la table `User` partagée
 * (ADMIN, OBSERVATEUR, SUPERADMIN, MEMBER — voir sso/src/entities/User.ts).
 *
 * Ce module ne fait aucune vérification de session à lui seul : il lit un
 * rôle déjà authentifié (JWT vérifié par verifySsoTokenWithRevocation, voir
 * ./session.ts) et un scope déjà extrait du payload, puis répond à la
 * question « ce rôle/scope a-t-il le droit sur cette ressource ? ». Une
 * vérification affirmative ici ne dispense jamais l'appelant de relire la
 * ressource elle-même en base (ex: une League appartient-elle vraiment à
 * cette Federation ?) — voir migration.md §3 : ne jamais faire confiance à
 * un identifiant de scope fourni sans le confronter à la base.
 */

/** Rôles cibles du modèle Fédération / Ligue / Club (migration.md §7). */
export const PLATFORM_ROLES = [
  "PLATFORM_SUPERADMIN",
  "FEDERATION_ADMIN",
  "LEAGUE_ADMIN",
  "CLUB_ADMIN",
  "CLUB_STAFF",
  "REFEREE",
  "MATCH_OFFICIAL",
  "REFEREE_OBSERVER",
  "MEMBER",
  "SELLER",
] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];

/** Rôles historiques encore émis/lus par les 6 apps clientes (compatibilité, migration.md §7). */
export const LEGACY_ROLES = ["SUPERADMIN", "ADMIN", "OBSERVATEUR", "MEMBER"] as const;

export type LegacyRole = (typeof LEGACY_ROLES)[number];

/**
 * Correspondance de migration.md §7 : `SUPERADMIN → PLATFORM_SUPERADMIN`,
 * `ADMIN → CLUB_ADMIN`, `OBSERVATEUR → CLUB_STAFF`. `MEMBER` est déjà un
 * rôle cible, inchangé. Additive : aucun rôle historique n'est retiré de
 * la base ni du JWT par cette table, elle ne sert qu'à interpréter un rôle
 * historique du point de vue du nouveau modèle d'autorisation.
 */
const LEGACY_TO_PLATFORM_ROLE: Record<LegacyRole, PlatformRole> = {
  SUPERADMIN: "PLATFORM_SUPERADMIN",
  ADMIN: "CLUB_ADMIN",
  OBSERVATEUR: "CLUB_STAFF",
  MEMBER: "MEMBER",
};

function isPlatformRole(role: string): role is PlatformRole {
  return (PLATFORM_ROLES as readonly string[]).includes(role);
}

function isLegacyRole(role: string): role is LegacyRole {
  return (LEGACY_ROLES as readonly string[]).includes(role);
}

/**
 * Interprète un rôle brut (issu du JWT, encore historique ou déjà cible)
 * comme un rôle cible. Un rôle inconnu (ni historique ni cible — ne
 * devrait jamais arriver pour un JWT signé par `sso`) retombe sur `null`,
 * à traiter comme "aucun accès" par l'appelant plutôt que de deviner.
 */
export function normalizeRole(role: string): PlatformRole | null {
  if (isPlatformRole(role)) return role;
  if (isLegacyRole(role)) return LEGACY_TO_PLATFORM_ROLE[role];
  return null;
}

export function isPlatformSuperAdmin(role: string): boolean {
  return normalizeRole(role) === "PLATFORM_SUPERADMIN";
}

/** Scope explicite porté par la session (migration.md §3/§8), jamais à faire confiance sans revérification serveur des ressources demandées. */
export interface AuthScope {
  federationId?: string | null;
  leagueId?: string | null;
  teamId?: string | null;
  matchId?: string | null;
}

export interface ScopedSession extends AuthScope {
  role: string;
}

/**
 * `PLATFORM_SUPERADMIN` a accès à toute fédération. `FEDERATION_ADMIN`
 * uniquement à la sienne (`session.federationId === federationId`, égalité
 * stricte — jamais de correspondance partielle/`undefined`). Tout autre
 * rôle n'a pas accès en écriture au niveau fédération.
 */
export function canAccessFederation(session: ScopedSession, federationId: string): boolean {
  const role = normalizeRole(session.role);
  if (role === "PLATFORM_SUPERADMIN") return true;
  if (role === "FEDERATION_ADMIN") return !!session.federationId && session.federationId === federationId;
  return false;
}

/**
 * `PLATFORM_SUPERADMIN` a accès à toute ligue. `LEAGUE_ADMIN` uniquement à
 * la sienne (`session.leagueId === leagueId`). `FEDERATION_ADMIN` accède
 * aux ligues de sa fédération — l'appelant DOIT fournir `leagueFederationId`
 * (relu en base, jamais déduit du scope client) pour que ce cas soit
 * évalué ; sans cette valeur, un `FEDERATION_ADMIN` est refusé plutôt que
 * supposé autorisé.
 */
export function canAccessLeague(
  session: ScopedSession,
  leagueId: string,
  leagueFederationId?: string | null,
): boolean {
  const role = normalizeRole(session.role);
  if (role === "PLATFORM_SUPERADMIN") return true;
  if (role === "LEAGUE_ADMIN") return !!session.leagueId && session.leagueId === leagueId;
  if (role === "FEDERATION_ADMIN") {
    return (
      !!session.federationId &&
      !!leagueFederationId &&
      session.federationId === leagueFederationId
    );
  }
  return false;
}

/** `PLATFORM_SUPERADMIN` uniquement — équivalent strict de l'ancien accès `SUPERADMIN` global. */
export function canAccessPlatform(session: ScopedSession): boolean {
  return normalizeRole(session.role) === "PLATFORM_SUPERADMIN";
}
