import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, requirePermission } from "@/lib/access";
import { TicketControllerService } from "@/services/TicketControllerService";
import { UserService } from "@/services/UserService";
import { ControllersManagement } from "./ControllersManagement";

export const dynamic = "force-dynamic";

/** Contrôleurs — comptes staff restreints au scan des billets (aucun autre accès admin). */
export default async function TicketControllersPage() {
  const teamId = await requireTeamId();
  const access = await getUserAccess();
  requirePermission(access, "ticketing.manageControllers");

  const controllerService = new TicketControllerService();
  const userService = new UserService();

  const [controllersData, usersData] = await Promise.all([controllerService.findAll(teamId), userService.findAllByTeam(teamId)]);

  const controllerUserIds = new Set(controllersData.map((c) => c.userId));
  const eligibleUsers = usersData.filter((u) => u.role === "OBSERVATEUR" && !controllerUserIds.has(u.id)).map((u) => ({ id: u.id, name: u.name, email: u.email }));

  const controllers = controllersData.map((c) => ({
    id: c.id,
    userName: c.user?.name ?? "Compte supprimé",
    userEmail: c.user?.email ?? "",
    gate: c.gate ?? null,
  }));

  return <ControllersManagement initialControllers={controllers} eligibleUsers={eligibleUsers} />;
}
