import { randomUUID } from "node:crypto";
import { getDataSource } from "@/lib/database";
import { AuditLog } from "@/entities/AuditLog";
import { Repository } from "typeorm";

export interface CreateAuditLogParams {
  userId: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  entity: string;
  entityId: string;
  before?: object;
  after?: object;
}

export interface AuditLogFilters {
  action?: string;
  entity?: string;
  userId?: string;
  from?: string;
  to?: string;
}

/**
 * Service for AuditLog operations — historique des mutations sur les
 * entités du module discipline (port de cardManager/lib/audit.ts).
 */
export class AuditLogService {
  private async getRepository(): Promise<Repository<AuditLog>> {
    const dataSource = await getDataSource();
    return dataSource.getRepository(AuditLog);
  }

  async create({ userId, action, entity, entityId, before, after }: CreateAuditLogParams): Promise<AuditLog> {
    const repository = await this.getRepository();
    const log = repository.create({
      id: randomUUID(),
      userId,
      action,
      entity,
      entityId,
      before: before !== undefined ? JSON.stringify(before) : null,
      after: after !== undefined ? JSON.stringify(after) : null,
    });
    return repository.save(log);
  }

  async findAll(
    filters: AuditLogFilters,
    page: number,
    limit: number
  ): Promise<{ logs: AuditLog[]; total: number; page: number; limit: number; pages: number }> {
    const repository = await this.getRepository();
    const qb = repository.createQueryBuilder("log").leftJoinAndSelect("log.user", "user");

    if (filters.action) qb.andWhere("log.action = :action", { action: filters.action });
    if (filters.entity) qb.andWhere("log.entity = :entity", { entity: filters.entity });
    if (filters.userId) qb.andWhere("log.userId = :userId", { userId: filters.userId });
    if (filters.from) qb.andWhere("log.createdAt >= :from", { from: new Date(filters.from) });
    if (filters.to) qb.andWhere("log.createdAt <= :to", { to: new Date(`${filters.to}T23:59:59Z`) });

    qb.orderBy("log.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    const [logs, total] = await qb.getManyAndCount();
    return { logs, total, page, limit, pages: Math.ceil(total / limit) };
  }
}
