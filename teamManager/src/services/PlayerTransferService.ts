import { randomUUID } from "node:crypto";
import type { EntityManager } from "typeorm";
import { getDataSource } from "@/lib/database";
import { Player } from "@/entities/Player";
import { Team } from "@/entities/Team";
import { TeamMember } from "@/entities/TeamMember";
import { PlayerTransfer, type PlayerTransferType, type PlayerTransferStatus } from "@/entities/PlayerTransfer";

export class PlayerTransferError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlayerTransferError";
  }
}

export interface CreateTransferInput {
  playerId: string;
  fromTeamId: string;
  toTeamId: string;
  transferType: PlayerTransferType;
  effectiveDate: string;
  seasonId?: string | null;
  fee?: string | null;
  currency?: string | null;
  loanStartDate?: string | null;
  loanEndDate?: string | null;
  notes?: string | null;
  createdBy?: string | null;
}

/**
 * Crée une demande de transfert (statut PENDING — migration.md §19).
 * Ne touche ni `Player.teamId` ni `cms_team_members` : ces mutations
 * n'ont lieu que dans `complete()`, dans une transaction unique.
 */
export async function createTransfer(input: CreateTransferInput): Promise<PlayerTransfer> {
  const dataSource = await getDataSource();

  if (input.fromTeamId === input.toTeamId) {
    throw new PlayerTransferError("Le club source et le club destination doivent être différents");
  }

  const player = await dataSource.getRepository(Player).findOne({ where: { id: input.playerId } });
  if (!player) {
    throw new PlayerTransferError("Joueur introuvable");
  }
  if (player.teamId !== input.fromTeamId) {
    throw new PlayerTransferError("Le club source ne correspond pas au club actuel du joueur");
  }

  const toTeam = await dataSource.getRepository(Team).findOne({ where: { id: input.toTeamId } });
  if (!toTeam) {
    throw new PlayerTransferError("Club destination introuvable");
  }

  const repo = dataSource.getRepository(PlayerTransfer);
  const transfer = repo.create({
    id: randomUUID(),
    playerId: input.playerId,
    fromTeamId: input.fromTeamId,
    toTeamId: input.toTeamId,
    transferType: input.transferType,
    status: "PENDING",
    effectiveDate: input.effectiveDate,
    seasonId: input.seasonId ?? null,
    fee: input.fee ?? null,
    currency: input.currency ?? null,
    loanStartDate: input.loanStartDate ?? null,
    loanEndDate: input.loanEndDate ?? null,
    notes: input.notes ?? null,
    createdBy: input.createdBy ?? null,
  });
  return repo.save(transfer);
}

async function closeCurrentMembership(manager: EntityManager, teamId: string, playerId: string, endDate: string): Promise<void> {
  const memberRepo = manager.getRepository(TeamMember);
  const current = await memberRepo.findOne({ where: { teamId, playerId, status: "ACTIVE" } });
  if (current) {
    current.status = "ENDED";
    current.endDate = new Date(endDate);
    await memberRepo.save(current);
  }
}

/**
 * Homologue et exécute un transfert PENDING/APPROVED (migration.md §20) :
 * clôture l'affiliation `cms_team_members` du club source, en ouvre une au
 * club destination, met à jour `Player.teamId` — le tout dans une seule
 * transaction DB, jamais un enchaînement d'appels séparés qui pourrait
 * laisser le joueur dans un état incohérent si l'un échoue.
 *
 * Idempotence : un transfert déjà `COMPLETED` ne peut pas être rejoué (une
 * double validation concurrente échoue sur la seconde tentative avec le
 * même message que "déjà complété").
 */
export async function completeTransfer(transferId: string, approvedBy?: string | null): Promise<PlayerTransfer> {
  const dataSource = await getDataSource();

  return dataSource.transaction(async (manager) => {
    const transferRepo = manager.getRepository(PlayerTransfer);
    const transfer = await transferRepo.findOne({ where: { id: transferId } });
    if (!transfer) {
      throw new PlayerTransferError("Transfert introuvable");
    }
    if (transfer.status === "COMPLETED") {
      throw new PlayerTransferError("Ce transfert est déjà complété");
    }
    if (transfer.status === "CANCELLED" || transfer.status === "REJECTED") {
      throw new PlayerTransferError(`Ce transfert est ${transfer.status.toLowerCase()}, il ne peut plus être complété`);
    }

    const playerRepo = manager.getRepository(Player);
    const player = await playerRepo.findOne({ where: { id: transfer.playerId } });
    if (!player) {
      throw new PlayerTransferError("Joueur introuvable");
    }
    if (player.teamId !== transfer.fromTeamId) {
      throw new PlayerTransferError(
        "Le joueur n'appartient plus au club source indiqué par ce transfert (déjà transféré ailleurs ?)",
      );
    }

    await closeCurrentMembership(manager, transfer.fromTeamId, transfer.playerId, transfer.effectiveDate);

    const memberRepo = manager.getRepository(TeamMember);
    const newMembership = memberRepo.create({
      teamId: transfer.toTeamId,
      playerId: transfer.playerId,
      status: "ACTIVE",
      startDate: new Date(transfer.effectiveDate),
    });
    await memberRepo.save(newMembership);

    player.teamId = transfer.toTeamId;
    await playerRepo.save(player);

    transfer.status = "COMPLETED";
    transfer.approvedBy = approvedBy ?? null;
    return transferRepo.save(transfer);
  });
}

export interface CloseTransferInput {
  status: "CANCELLED" | "REJECTED";
  reason?: string | null;
}

/** Annule ou rejette un transfert qui n'a pas encore été complété — ne touche ni Player ni cms_team_members. */
export async function closeTransfer(transferId: string, input: CloseTransferInput): Promise<PlayerTransfer> {
  const dataSource = await getDataSource();
  const repo = dataSource.getRepository(PlayerTransfer);
  const transfer = await repo.findOne({ where: { id: transferId } });
  if (!transfer) {
    throw new PlayerTransferError("Transfert introuvable");
  }
  if (transfer.status === "COMPLETED") {
    throw new PlayerTransferError("Un transfert déjà complété ne peut pas être annulé/rejeté");
  }
  transfer.status = input.status;
  transfer.statusReason = input.reason ?? null;
  return repo.save(transfer);
}

export async function getTransferById(transferId: string): Promise<PlayerTransfer | null> {
  const dataSource = await getDataSource();
  return dataSource.getRepository(PlayerTransfer).findOne({ where: { id: transferId } });
}

/**
 * migration.md §23 : tableau de bord Transferts (superadmin) — pas de
 * filtre par fédération ici (`team_affiliations` vit côté superadmin, pas
 * dans cette base) : `superadmin` filtre le résultat après coup avec sa
 * propre connaissance des affiliations, voir playerTransferClient.ts.
 */
export async function listTransfers(status?: PlayerTransferStatus, limit = 200): Promise<PlayerTransfer[]> {
  const dataSource = await getDataSource();
  const repo = dataSource.getRepository(PlayerTransfer);
  return repo.find({
    where: status ? { status } : {},
    order: { createdAt: "DESC" },
    take: limit,
  });
}
