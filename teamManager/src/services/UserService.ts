import { getDataSource } from "@/lib/database";
import { User } from "@/entities/User";
import { Repository } from "typeorm";

/**
 * Service for User operations (authentification).
 * `User` est la table de comptes partagée avec cardManager : un même compte
 * ADMIN/OBSERVATEUR rattaché à un club sert pour les deux applications.
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
}
