import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { getDataSource } from "@/lib/database";
import { User } from "@/entities/User";
import { Repository } from "typeorm";

/**
 * Service for User operations (authentification + gestion des comptes du
 * club). `User` est la table de comptes partagée avec cardManager : un même
 * compte ADMIN/OBSERVATEUR rattaché à un club sert pour les deux
 * applications. club-hub est l'endroit où le président du club (ADMIN)
 * crée les comptes de son équipe (staff, coachs...) et leur attribue des
 * rôles (voir RoleService) ; tout est scopé par teamId pour ne jamais
 * toucher aux comptes des autres clubs.
 */
export class UserService {
  private async getRepository(): Promise<Repository<User>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(User);
  }

  /**
   * Find an active user by email, for login.
   */
  async findByEmail(email: string): Promise<User | null> {
    const repository = await this.getRepository();
    return repository.findOne({ where: { email } });
  }

  /** Comptes du club (hors SUPERADMIN, toujours sans teamId). */
  async findAllByTeam(teamId: string): Promise<User[]> {
    const repository = await this.getRepository();
    return repository.find({ where: { teamId }, order: { name: "ASC" } });
  }

  async findById(id: string, teamId: string): Promise<User | null> {
    const repository = await this.getRepository();
    return repository.findOne({ where: { id, teamId } });
  }

  /**
   * Crée un nouveau compte pour le club (staff/coach...). Toujours créé en
   * rôle OBSERVATEUR : seul un accès direct à la base peut créer un second
   * ADMIN (le président), pour éviter qu'un compte délégué s'auto-promeuve.
   */
  async create(
    data: { name: string; email: string; password: string; isActive?: boolean },
    teamId: string
  ): Promise<User> {
    const repository = await this.getRepository();

    const existing = await repository.findOne({ where: { email: data.email } });
    if (existing) {
      throw new Error("Un compte existe déjà avec cet email");
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const user = repository.create({
      id: randomUUID(),
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: "OBSERVATEUR",
      isActive: data.isActive ?? true,
      teamId,
    });
    return repository.save(user);
  }

  async update(
    id: string,
    teamId: string,
    data: { name?: string; email?: string; password?: string; isActive?: boolean }
  ): Promise<User> {
    const repository = await this.getRepository();
    const user = await this.findById(id, teamId);
    if (!user) {
      throw new Error("Compte non trouvé");
    }
    if (user.role === "ADMIN" && data.isActive === false) {
      throw new Error("Impossible de désactiver le compte administrateur du club");
    }

    if (data.email && data.email !== user.email) {
      const existing = await repository.findOne({ where: { email: data.email } });
      if (existing && existing.id !== id) {
        throw new Error("Un compte existe déjà avec cet email");
      }
      user.email = data.email;
    }
    if (data.name !== undefined) user.name = data.name;
    if (data.isActive !== undefined) user.isActive = data.isActive;
    if (data.password) {
      user.password = await bcrypt.hash(data.password, 12);
    }

    return repository.save(user);
  }

  async delete(id: string, teamId: string): Promise<boolean> {
    const repository = await this.getRepository();
    const user = await this.findById(id, teamId);
    if (!user) {
      throw new Error("Compte non trouvé");
    }
    if (user.role === "ADMIN") {
      throw new Error("Impossible de supprimer le compte administrateur du club");
    }
    await repository.remove(user);
    return true;
  }
}
