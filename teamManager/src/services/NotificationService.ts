import { getDataSource } from "@/lib/database";
import { Notification, NotificationTargetType } from "@/entities/Notification";
import { NotificationRead } from "@/entities/NotificationRead";
import { Repository } from "typeorm";
import { AgeCategory } from "@/types/categories";

/**
 * Service for Notification operations (communication interne : annonces
 * diffusées par le club, scopées par catégorie pour les rôles restreints).
 */
export class NotificationService {
  private async getRepository(): Promise<Repository<Notification>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Notification);
  }

  private async getReadRepository(): Promise<Repository<NotificationRead>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(NotificationRead);
  }

  /**
   * Notifications visibles par l'utilisateur : club-entier (category NULL)
   * + celles de ses catégories autorisées. `categories: "ALL"` ne filtre pas.
   */
  async findAll(teamId: string, categories?: "ALL" | AgeCategory[]): Promise<Notification[]> {
    const repository = await this.getRepository();
    if (categories && categories !== "ALL") {
      const qb = repository
        .createQueryBuilder("n")
        .leftJoinAndSelect("n.match", "match")
        .leftJoinAndSelect("match.homeTeam", "homeTeam")
        .leftJoinAndSelect("match.awayTeam", "awayTeam")
        .where("n.teamId = :teamId", { teamId })
        .orderBy("n.createdAt", "DESC");

      if (categories.length === 0) {
        qb.andWhere("n.category IS NULL");
      } else {
        qb.andWhere("(n.category IS NULL OR n.category IN (:...categories))", { categories });
      }
      return qb.getMany();
    }
    return repository.find({
      where: { teamId },
      relations: ["match", "match.homeTeam", "match.awayTeam"],
      order: { createdAt: "DESC" },
    });
  }

  async findById(id: number, teamId: string): Promise<Notification | null> {
    const repository = await this.getRepository();
    return repository.findOne({ where: { id, teamId } });
  }

  async create(
    data: {
      title: string;
      message: string;
      targetType?: NotificationTargetType;
      category?: AgeCategory | null;
      isUrgent?: boolean;
      matchId?: string | null;
    },
    teamId: string,
    createdBy: string | null
  ): Promise<Notification> {
    const repository = await this.getRepository();
    const notification = repository.create({ ...data, teamId, createdBy });
    return repository.save(notification);
  }

  async delete(id: number, teamId: string): Promise<boolean> {
    const repository = await this.getRepository();
    const notification = await this.findById(id, teamId);
    if (!notification) {
      throw new Error("Notification non trouvée");
    }
    await repository.remove(notification);
    return true;
  }

  // ---- Accusés de lecture ---------------------------------------------

  /** Marque une notification comme lue par un compte (idempotent). */
  async markAsRead(notificationId: number, userId: string): Promise<void> {
    const repository = await this.getReadRepository();
    const existing = await repository.findOne({ where: { notificationId, userId } });
    if (existing) return;
    const read = repository.create({ notificationId, userId });
    await repository.save(read);
  }

  async getReadCount(notificationId: number): Promise<number> {
    const repository = await this.getReadRepository();
    return repository.count({ where: { notificationId } });
  }

  async hasRead(notificationId: number, userId: string): Promise<boolean> {
    const repository = await this.getReadRepository();
    const existing = await repository.findOne({ where: { notificationId, userId } });
    return Boolean(existing);
  }
}
