import { getDataSource } from "@/lib/database";
import { Notification, NotificationTargetType } from "@/entities/Notification";
import { Repository } from "typeorm";

/**
 * Service for Notification operations (annonces diffusées par le club).
 */
export class NotificationService {
  private async getRepository(): Promise<Repository<Notification>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(Notification);
  }

  async findAll(teamId: string): Promise<Notification[]> {
    const repository = await this.getRepository();
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
}
