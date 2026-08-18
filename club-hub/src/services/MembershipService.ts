import { getDataSource } from "@/lib/database";
import { Membership, MembershipType, type MembershipTypeCode } from "@/entities/Membership";

export interface MembershipTypeInput {
  code: MembershipTypeCode;
  labelFr: string;
  labelAr?: string | null;
  isActive?: boolean;
  requiresApproval?: boolean;
  durationDays?: number | null;
  rights?: string[] | null;
}

export interface ActiveMembershipResult {
  membershipId: string;
  membershipTypeId: string;
  code: MembershipTypeCode;
  rights: string[];
  expiresAt: Date | null;
}

/**
 * OB-002 : types de membership configurables par club (droits/durée/
 * approbation), et cycle de vie des candidatures de membership. OB-003
 * (prévente billetterie) consomme `findActiveForUser` — jamais un simple
 * claim client, voir `/api/internal/memberships/active`.
 */
export class MembershipService {
  async listTypes(teamId: string, activeOnly = false): Promise<MembershipType[]> {
    const ds = await getDataSource();
    return ds.getRepository(MembershipType).find({
      where: activeOnly ? { teamId, isActive: true } : { teamId },
      order: { code: "ASC" },
    });
  }

  async upsertType(
    teamId: string,
    input: MembershipTypeInput,
    actorUserId: string,
  ): Promise<MembershipType> {
    const ds = await getDataSource();
    const repository = ds.getRepository(MembershipType);
    const existing = await repository.findOne({ where: { teamId, code: input.code } });
    const row =
      existing ??
      repository.create({
        teamId,
        code: input.code,
        labelFr: input.labelFr,
        labelAr: null,
        isActive: true,
        requiresApproval: false,
        durationDays: null,
        rights: null,
        version: 0,
      });
    row.labelFr = input.labelFr;
    row.labelAr = input.labelAr ?? null;
    row.isActive = input.isActive ?? row.isActive ?? true;
    row.requiresApproval = input.requiresApproval ?? false;
    row.durationDays = input.durationDays ?? null;
    row.rights = input.rights ?? null;
    row.version = (existing?.version ?? 0) + 1;
    row.updatedBy = actorUserId;
    return repository.save(row);
  }

  async listApplications(teamId: string, status?: Membership["status"]): Promise<Membership[]> {
    const ds = await getDataSource();
    return ds.getRepository(Membership).find({
      where: status ? { teamId, status } : { teamId },
      order: { createdAt: "DESC" },
      relations: ["membershipType"],
    });
  }

  /** Soumission publique (espace membre) : une seule candidature/membership non terminale à la fois. */
  async apply(teamId: string, userId: string, membershipTypeId: string): Promise<Membership> {
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const type = await manager
        .getRepository(MembershipType)
        .findOne({ where: { id: membershipTypeId, teamId } });
      if (!type || !type.isActive) {
        throw new Error("Type de membership indisponible");
      }

      const existing = await manager.getRepository(Membership).findOne({
        where: [
          { teamId, userId, status: "SUBMITTED" },
          { teamId, userId, status: "ACTIVE" },
        ],
      });
      if (existing) {
        throw new Error("Une candidature ou un membership actif existe déjà pour ce club");
      }

      const repository = manager.getRepository(Membership);
      const now = new Date();
      if (type.requiresApproval) {
        return repository.save(
          repository.create({
            teamId,
            userId,
            membershipTypeId: type.id,
            status: "SUBMITTED",
            approvedAt: null,
            approvedBy: null,
            rejectionReason: null,
            expiresAt: null,
          }),
        );
      }

      return repository.save(
        repository.create({
          teamId,
          userId,
          membershipTypeId: type.id,
          status: "ACTIVE",
          approvedAt: now,
          approvedBy: null,
          rejectionReason: null,
          expiresAt: type.durationDays ? new Date(now.getTime() + type.durationDays * 86_400_000) : null,
        }),
      );
    });
  }

  async approve(teamId: string, membershipId: string, actorUserId: string): Promise<Membership> {
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const repository = manager.getRepository(Membership);
      const membership = await repository.findOne({ where: { id: membershipId, teamId } });
      if (!membership || membership.status !== "SUBMITTED") {
        throw new Error("Candidature introuvable ou déjà traitée");
      }
      const type = await manager.getRepository(MembershipType).findOne({ where: { id: membership.membershipTypeId } });
      if (!type) throw new Error("Type de membership introuvable");

      const now = new Date();
      membership.status = "ACTIVE";
      membership.approvedAt = now;
      membership.approvedBy = actorUserId;
      membership.expiresAt = type.durationDays ? new Date(now.getTime() + type.durationDays * 86_400_000) : null;
      return repository.save(membership);
    });
  }

  async reject(teamId: string, membershipId: string, actorUserId: string, reason: string): Promise<Membership> {
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 3) throw new Error("Un motif de rejet est obligatoire");
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const repository = manager.getRepository(Membership);
      const membership = await repository.findOne({ where: { id: membershipId, teamId } });
      if (!membership || membership.status !== "SUBMITTED") {
        throw new Error("Candidature introuvable ou déjà traitée");
      }
      membership.status = "REJECTED";
      membership.approvedBy = actorUserId;
      membership.rejectionReason = normalizedReason;
      return repository.save(membership);
    });
  }

  async cancel(teamId: string, userId: string, membershipId: string): Promise<Membership> {
    const ds = await getDataSource();
    const repository = ds.getRepository(Membership);
    const membership = await repository.findOne({ where: { id: membershipId, teamId, userId } });
    if (!membership || (membership.status !== "SUBMITTED" && membership.status !== "ACTIVE")) {
      throw new Error("Membership introuvable ou déjà résolu");
    }
    membership.status = "CANCELLED";
    return repository.save(membership);
  }

  /**
   * OB-003 : seule source de vérité pour "cet utilisateur a un membership
   * actif pour ce club" — un `expiresAt` dépassé est traité comme inactif
   * même si la colonne `status` n'a pas encore été balayée par `expireDue`.
   */
  async findActiveForUser(teamId: string, userId: string): Promise<ActiveMembershipResult | null> {
    const ds = await getDataSource();
    const now = new Date();
    const memberships = await ds.getRepository(Membership).find({
      where: { teamId, userId, status: "ACTIVE" },
      relations: ["membershipType"],
    });
    const active = memberships.find((m) => !m.expiresAt || m.expiresAt.getTime() > now.getTime());
    if (!active) return null;
    return {
      membershipId: active.id,
      membershipTypeId: active.membershipTypeId,
      code: active.membershipType.code,
      rights: active.membershipType.rights ?? [],
      expiresAt: active.expiresAt,
    };
  }

  /** Hygiène de la colonne `status` — la vérité opérationnelle reste `findActiveForUser`. */
  async expireDue(now: Date = new Date(), limit = 200): Promise<number> {
    const ds = await getDataSource();
    const result = await ds
      .getRepository(Membership)
      .createQueryBuilder()
      .update(Membership)
      .set({ status: "EXPIRED" })
      .where("status = :status AND expires_at IS NOT NULL AND expires_at <= :now", { status: "ACTIVE", now })
      .limit(limit)
      .execute();
    return result.affected ?? 0;
  }
}
