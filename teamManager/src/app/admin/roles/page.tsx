import { requireTeamId } from "@/lib/team-context";
import { RoleService } from "@/services/RoleService";
import { UserService } from "@/services/UserService";
import { InternalTeamService } from "@/services/InternalTeamService";
import { PERMISSION_MODULES } from "@/lib/permissions";
import { RolesManagement } from "./RolesManagement";

export const dynamic = "force-dynamic";

/**
 * Page Rôles & permissions — réservée au président du club (ADMIN). Permet
 * de créer des rôles (ex: Secrétaire, Coach) avec un jeu de permissions, et
 * de les attribuer aux comptes du club (avec une catégorie pour les rôles
 * non globaux, ex: "Coach" attribué à une personne pour U17).
 */
export default async function RolesPage() {
  const teamId = await requireTeamId();

  const roleService = new RoleService();
  await roleService.ensureDefaultRoles(teamId);

  const userService = new UserService();
  const squadService = new InternalTeamService();
  const [rolesData, assignmentsData, usersData, squadsData] = await Promise.all([
    roleService.findAll(teamId),
    roleService.findAssignmentsForTeam(teamId),
    userService.findAllByTeam(teamId),
    squadService.findAll(teamId),
  ]);

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
    userName: a.user?.name ?? "Compte inconnu",
    roleId: a.roleId,
    roleName: a.role?.name ?? "Rôle inconnu",
    category: a.category ?? null,
    internalTeamId: a.internalTeamId ?? null,
    internalTeamName: a.internalTeam?.name ?? null,
  }));

  const users = usersData
    .filter((u) => u.role === "OBSERVATEUR")
    .map((u) => ({ id: u.id, name: u.name, email: u.email }));

  const squads = squadsData.map((s) => ({ id: s.id, name: s.name, category: s.category }));

  return <RolesManagement initialRoles={roles} initialAssignments={assignments} users={users} squads={squads} permissionModules={PERMISSION_MODULES} />;
}
