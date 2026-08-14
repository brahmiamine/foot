import { requireTeamId } from "@/lib/team-context";
import { UserService } from "@/services/UserService";
import { RoleService } from "@/services/RoleService";
import { UsersManagement } from "./UsersManagement";

export const dynamic = "force-dynamic";

/**
 * Page Utilisateurs — réservée au président du club (ADMIN). Création des
 * comptes (staff, coachs...) ; l'attribution des rôles se fait ensuite dans
 * la page Rôles & permissions.
 */
export default async function UsersPage() {
  const teamId = await requireTeamId();

  const userService = new UserService();
  const roleService = new RoleService();
  const [usersData, assignmentsData] = await Promise.all([
    userService.findAllByTeam(teamId),
    roleService.findAssignmentsForTeam(teamId),
  ]);

  const rolesByUser = new Map<string, string[]>();
  for (const a of assignmentsData) {
    const label = a.role ? `${a.role.name}${a.category ? ` (${a.category.toUpperCase()})` : ""}` : "Rôle inconnu";
    const list = rolesByUser.get(a.userId) ?? [];
    list.push(label);
    rolesByUser.set(a.userId, list);
  }

  const users = usersData.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
    roleLabels: rolesByUser.get(u.id) ?? [],
  }));

  return <UsersManagement initialUsers={users} />;
}
