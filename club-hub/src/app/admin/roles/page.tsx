import { requireTeamId } from "@/lib/team-context";
import { RoleService } from "@/services/RoleService";
import { UserService } from "@/services/UserService";
import { PERMISSION_MODULES } from "@/lib/permissions";
import { RolesManagement } from "./RolesManagement";

export const dynamic = "force-dynamic";

/**
 * Page Rôles & permissions — RBAC belongs to Club; account display data comes
 * from Identity through UserService instead of a TypeORM User relation.
 */
export default async function RolesPage() {
  const teamId = await requireTeamId();

  const roleService = new RoleService();
  await roleService.ensureDefaultRoles(teamId);

  const userService = new UserService();
  const [rolesData, assignmentsData, usersData] = await Promise.all([
    roleService.findAll(teamId),
    roleService.findAssignmentsForTeam(teamId),
    userService.findAllByTeam(teamId),
  ]);

  const usersById = new Map(usersData.map((user) => [user.id, user]));

  const roles = rolesData.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description ?? null,
    isGlobal: r.isGlobal,
    isSystem: r.isSystem,
    permissions: RoleService.parsePermissions(r),
  }));

  const assignments = assignmentsData.map((a) => ({
    id: a.id,
    userId: a.userId,
    userName: usersById.get(a.userId)?.name ?? "Compte inconnu",
    roleId: a.roleId,
    roleName: a.role?.name ?? "Rôle inconnu",
    category: a.category ?? null,
  }));

  const users = usersData
    .filter((u) => u.role === "OBSERVATEUR")
    .map((u) => ({ id: u.id, name: u.name, email: u.email }));

  return <RolesManagement initialRoles={roles} initialAssignments={assignments} users={users} permissionModules={PERMISSION_MODULES} />;
}
