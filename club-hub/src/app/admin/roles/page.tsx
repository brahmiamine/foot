import { getUserAccess, requirePermission } from "@/lib/access";
import { requireTeamId } from "@/lib/team-context";
import { RoleService } from "@/services/RoleService";
import { UserService } from "@/services/UserService";
import { PERMISSION_MODULES } from "@/lib/permissions";
import { AGE_CATEGORIES, type AgeCategory } from "@/types/categories";
import { RolesManagement } from "./RolesManagement";

export const dynamic = "force-dynamic";

/**
 * RBAC administration + CLUB-012 temporary assignments/delegations.
 * Permanent role mutation remains intrinsic-ADMIN only. Non-admin role
 * managers receive only governance rows inside their DIRECT roles.manage
 * scope, preventing a category-scoped delegation from exposing club-wide
 * RBAC metadata.
 */
export default async function RolesPage() {
  const teamId = await requireTeamId();
  const access = await getUserAccess();
  if (access.teamId !== teamId) throw new Error("Contexte club incohérent");
  requirePermission(access, "roles.manage");

  const roleService = new RoleService();
  if (access.isClubAdmin) await roleService.ensureDefaultRoles(teamId);

  const userService = new UserService();
  const [rolesData, assignmentsData, delegationsData, usersData] = await Promise.all([
    roleService.findAll(teamId),
    roleService.findAssignmentsForTeam(teamId),
    roleService.findDelegationsForTeam(teamId),
    userService.findAllByTeam(teamId),
  ]);

  const usersById = new Map(usersData.map((user) => [user.id, user]));
  const now = new Date();
  const scopeAuthorities = await Promise.all([
    roleService.getDirectAuthority(teamId, access.userId, null, now).then((authority) => ["ALL", authority] as const),
    ...AGE_CATEGORIES.map((category) =>
      roleService.getDirectAuthority(teamId, access.userId, category, now).then((authority) => [category, authority] as const)
    ),
  ]);

  const delegableScopes = Object.fromEntries(
    scopeAuthorities
      .filter(([, authority]) => authority.permissions.has("roles.manage"))
      .map(([scope, authority]) => [scope, Array.from(authority.permissions)]),
  );
  const hasDirectGlobalRoleManagement = scopeAuthorities.some(
    ([scope, authority]) => scope === "ALL" && authority.permissions.has("roles.manage"),
  );
  const directlyManagedCategories = new Set<AgeCategory>(
    scopeAuthorities
      .filter(([scope, authority]) => scope !== "ALL" && authority.permissions.has("roles.manage"))
      .map(([scope]) => scope as AgeCategory),
  );
  const canViewAllGovernance = access.isClubAdmin || hasDirectGlobalRoleManagement;

  // Role definitions are club-wide security metadata and are only serialized
  // to the intrinsic admin. Delegators need the permission catalogue, not the
  // definitions of unrelated roles.
  const roles = access.isClubAdmin
    ? rolesData.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description ?? null,
        isGlobal: role.isGlobal,
        isSystem: role.isSystem,
        permissions: RoleService.parsePermissions(role),
      }))
    : [];

  const visibleAssignments = canViewAllGovernance
    ? assignmentsData
    : assignmentsData.filter((assignment) =>
        assignment.userId === access.userId ||
        Boolean(assignment.category && directlyManagedCategories.has(assignment.category)),
      );
  const assignments = visibleAssignments.map((assignment) => ({
    id: assignment.id,
    userId: assignment.userId,
    userName: usersById.get(assignment.userId)?.name ?? "Compte inconnu",
    roleId: assignment.roleId,
    roleName: assignment.role?.name ?? "Rôle inconnu",
    category: assignment.category ?? null,
    validFrom: assignment.validFrom?.toISOString() ?? null,
    validUntil: assignment.validUntil?.toISOString() ?? null,
    grantReason: assignment.grantReason ?? null,
    revokedAt: assignment.revokedAt?.toISOString() ?? null,
    revocationReason: assignment.revocationReason ?? null,
  }));

  const visibleDelegations = canViewAllGovernance
    ? delegationsData
    : delegationsData.filter((delegation) =>
        delegation.delegatorUserId === access.userId ||
        delegation.delegateeUserId === access.userId ||
        Boolean(delegation.category && directlyManagedCategories.has(delegation.category)),
      );
  const delegations = visibleDelegations.map((delegation) => ({
    id: delegation.id,
    delegatorUserId: delegation.delegatorUserId,
    delegatorName: usersById.get(delegation.delegatorUserId)?.name ?? "Administrateur club",
    delegateeUserId: delegation.delegateeUserId,
    delegateeName: usersById.get(delegation.delegateeUserId)?.name ?? "Compte inconnu",
    permissions: RoleService.parseDelegationPermissions(delegation),
    category: delegation.category ?? null,
    validFrom: delegation.validFrom.toISOString(),
    validUntil: delegation.validUntil.toISOString(),
    reason: delegation.reason,
    revokedAt: delegation.revokedAt?.toISOString() ?? null,
    revocationReason: delegation.revocationReason ?? null,
    canRevoke: access.isClubAdmin || delegation.delegatorUserId === access.userId,
  }));

  const canCreateDelegation = Object.keys(delegableScopes).length > 0;
  const users = (access.isClubAdmin || canCreateDelegation ? usersData : [])
    .filter((user) => user.role === "OBSERVATEUR" && user.isActive)
    .map((user) => ({ id: user.id, name: user.name, email: user.email }));

  return (
    <RolesManagement
      initialRoles={roles}
      initialAssignments={assignments}
      initialDelegations={delegations}
      users={users}
      permissionModules={PERMISSION_MODULES}
      canAdministerRoles={access.isClubAdmin}
      delegableScopes={delegableScopes}
    />
  );
}