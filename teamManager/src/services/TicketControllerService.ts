import { getDataSource } from "@/lib/database";
import { TicketController } from "@/entities/TicketController";
import { User } from "@/entities/User";
import { UserRole } from "@/entities/UserRole";
import { RoleService } from "@/services/RoleService";
import { Repository } from "typeorm";

export const CONTROLLER_ROLE_NAME = "Contrôleur billetterie";
const CONTROLLER_PERMISSIONS = ["ticketing.scan", "ticketing.viewStats"];

/**
 * Service for TicketController operations — un contrôleur est un compte
 * OBSERVATEUR du club (créé via UserService, comme n'importe quel compte
 * staff) auquel on attribue le rôle système "Contrôleur billetterie"
 * (permissions ticketing.scan + ticketing.viewStats uniquement : il n'a pas
 * accès au reste de l'admin). `cms_ticket_controllers` ne fait qu'associer
 * une porte par défaut à ce compte.
 */
export class TicketControllerService {
  private async getRepository(): Promise<Repository<TicketController>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(TicketController);
  }

  /** Crée le rôle système "Contrôleur billetterie" du club s'il n'existe pas encore. */
  async ensureControllerRole(teamId: string) {
    const roleService = new RoleService();
    const roles = await roleService.findAll(teamId);
    const existing = roles.find((r) => r.name === CONTROLLER_ROLE_NAME);
    if (existing) return existing;
    return roleService.create({ name: CONTROLLER_ROLE_NAME, description: "Accès limité au scan des billets à l'entrée du stade", isGlobal: true, permissions: CONTROLLER_PERMISSIONS }, teamId);
  }

  async findAll(teamId: string): Promise<Array<TicketController & { user: User | null }>> {
    const repository = await this.getRepository();
    const controllers = await repository.find({ where: { teamId }, order: { createdAt: "DESC" } });
    if (controllers.length === 0) return [];

    const dataSource = await getDataSource();
    const users = await dataSource.getRepository(User).find({ where: { teamId } });
    const usersById = new Map(users.map((u) => [u.id, u]));
    return controllers.map((c) => ({ ...c, user: usersById.get(c.userId) ?? null }));
  }

  /** Attribue le rôle contrôleur à un compte existant du club et l'associe à une porte. */
  async assign(teamId: string, userId: string, gate: string | null): Promise<TicketController> {
    const dataSource = await getDataSource();
    const user = await dataSource.getRepository(User).findOne({ where: { id: userId, teamId } });
    if (!user) {
      throw new Error("Compte non trouvé pour ce club");
    }

    const role = await this.ensureControllerRole(teamId);
    const roleService = new RoleService();
    await roleService.assignRole(teamId, userId, Number(role.id), null);

    const repository = await this.getRepository();
    let controller = await repository.findOne({ where: { teamId, userId } });
    if (controller) {
      controller.gate = gate;
    } else {
      controller = repository.create({ teamId, userId, gate });
    }
    return repository.save(controller);
  }

  async updateGate(id: number, teamId: string, gate: string | null): Promise<TicketController> {
    const repository = await this.getRepository();
    const controller = await repository.findOne({ where: { id, teamId } });
    if (!controller) {
      throw new Error("Contrôleur non trouvé");
    }
    controller.gate = gate;
    return repository.save(controller);
  }

  async remove(id: number, teamId: string): Promise<boolean> {
    const repository = await this.getRepository();
    const controller = await repository.findOne({ where: { id, teamId } });
    if (!controller) {
      throw new Error("Contrôleur non trouvé");
    }

    const role = await this.ensureControllerRole(teamId);
    const dataSource = await getDataSource();
    await dataSource.getRepository(UserRole).delete({ teamId, userId: controller.userId, roleId: Number(role.id) });

    await repository.remove(controller);
    return true;
  }
}
