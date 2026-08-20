export interface AccessWindow {
  validFrom: Date | null;
  validUntil: Date | null;
  revokedAt: Date | null;
}

export interface DirectRoleGrant extends AccessWindow {
  permissions: string[];
  category: string | null;
  isGlobal: boolean;
}

export interface DirectAuthority {
  permissions: Set<string>;
  canGlobalScope: boolean;
  category: string | null;
}

export interface DelegationGrantRequest {
  requestedPermissions: string[];
  category: string | null;
  validFrom: Date;
  validUntil: Date;
  reason: string;
  authority: DirectAuthority;
}

/** Half-open window `[validFrom, validUntil)`; legacy null/null remains active. */
export function isAccessWindowActive(window: AccessWindow, at: Date = new Date()): boolean {
  if (window.revokedAt && window.revokedAt.getTime() <= at.getTime()) return false;
  if (window.validFrom && window.validFrom.getTime() > at.getTime()) return false;
  if (window.validUntil && window.validUntil.getTime() <= at.getTime()) return false;
  return true;
}

function coversWindow(window: AccessWindow, validFrom: Date, validUntil: Date): boolean {
  if (window.revokedAt) return false;
  if (window.validFrom && window.validFrom.getTime() > validFrom.getTime()) return false;
  if (window.validUntil && window.validUntil.getTime() < validUntil.getTime()) return false;
  return true;
}

function addGrantToAuthority(
  authority: DirectAuthority,
  grant: DirectRoleGrant,
  category: string | null,
): void {
  if (grant.isGlobal) {
    authority.canGlobalScope = true;
    grant.permissions.forEach((permission) => authority.permissions.add(permission));
    return;
  }
  if (category !== null && grant.category === category) {
    grant.permissions.forEach((permission) => authority.permissions.add(permission));
  }
}

/**
 * Resolve authority only from direct role grants. Received delegations must
 * never be fed into this function, which makes delegated rights terminal.
 */
export function resolveDirectAuthority(
  grants: readonly DirectRoleGrant[],
  category: string | null,
  at: Date = new Date(),
): DirectAuthority {
  const authority: DirectAuthority = { permissions: new Set<string>(), canGlobalScope: false, category };
  for (const grant of grants) {
    if (!isAccessWindowActive(grant, at)) continue;
    addGrantToAuthority(authority, grant, category);
  }
  return authority;
}

/**
 * Authority that is guaranteed to remain direct for the whole requested
 * delegation interval. A temporary source role cannot mint a delegation
 * extending beyond its own end date.
 */
export function resolveDirectAuthorityForWindow(
  grants: readonly DirectRoleGrant[],
  category: string | null,
  validFrom: Date,
  validUntil: Date,
): DirectAuthority {
  const authority: DirectAuthority = { permissions: new Set<string>(), canGlobalScope: false, category };
  for (const grant of grants) {
    if (!coversWindow(grant, validFrom, validUntil)) continue;
    addGrantToAuthority(authority, grant, category);
  }
  return authority;
}

export function validateDelegationGrant(request: DelegationGrantRequest): void {
  if (!request.reason.trim()) throw new Error("Un motif de délégation est obligatoire");
  if (request.validUntil.getTime() <= request.validFrom.getTime()) {
    throw new Error("La fin de délégation doit être postérieure au début");
  }
  if (request.requestedPermissions.length === 0) {
    throw new Error("Au moins une permission doit être déléguée");
  }
  if (request.category === null && !request.authority.canGlobalScope) {
    throw new Error("La portée globale exige un rôle direct global");
  }
  for (const permission of request.requestedPermissions) {
    if (!request.authority.permissions.has(permission)) {
      throw new Error(`La permission ${permission} dépasse l'autorité directe du délégant`);
    }
  }
}
