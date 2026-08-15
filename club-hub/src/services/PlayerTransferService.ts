import { randomUUID } from "node:crypto";
import type { EntityManager } from "typeorm";
import { getDataSource } from "@/lib/database";
import { notify } from "@/lib/notificationClient";
import { Player } from "@/entities/Player";
import { Team } from "@/entities/Team";
import { TeamMember } from "@/entities/TeamMember";
import { PlayerTransfer, type PlayerTransferType, type PlayerTransferStatus } from "@/entities/PlayerTransfer";
import { hasActiveTransferBan } from "@/services/ClubSanctionService";
import { findOpenTransferWindow } from "@/services/TransferWindowService";
import { assertTransferRepresentation } from "@/services/AgentService";
import { assertTransferException } from "../../../packages/regulatory-shared/src/transferWindow";

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
  agentId?: string | null;
  representationAgreementId?: string | null;
  intermediaryDeclaration?: string | null;
  createdBy?: string | null;
}

async function emitTransferNotification(
  transfer: PlayerTransfer,
  type: "PLAYER_TRANSFER_REQUESTED" | "PLAYER_TRANSFER_APPROVED" | "PLAYER_TRANSFER_REJECTED" | "PLAYER_TRANSFER_COMPLETED",
): Promise<void> {
  const commonData = {
    transferId: transfer.id,
    playerId: transfer.playerId,
    fromTeamId: transfer.fromTeamId,
    toTeamId: transfer.toTeamId,
    transferType: transfer.transferType,
    effectiveDate: transfer.effectiveDate,
    status: transfer.status,
    agentId: transfer.agentId ?? null,
    representationAgreementId: transfer.representationAgreementId ?? null,
  };

  const titleByType: Record<typeof type, string> = {
    PLAYER_TRANSFER_REQUESTED: "Nouvelle demande de transfert",
    PLAYER_TRANSFER_APPROVED: "Transfert approuvé par le club destination",
    PLAYER_TRANSFER_REJECTED: "Transfert rejeté",
    PLAYER_TRANSFER_COMPLETED: "Transfert homologué",
  };

  const bodyByType: Record<typeof type, string> = {
    PLAYER_TRANSFER_REQUESTED: `Une demande de transfert du joueur ${transfer.playerId} vers le club ${transfer.toTeamId} est en attente.`,
    PLAYER_TRANSFER_APPROVED: `Le club destination ${transfer.toTeamId} a approuvé le transfert du joueur ${transfer.playerId}.`,
    PLAYER_TRANSFER_REJECTED: `Le transfert du joueur ${transfer.playerId} a été rejeté.`,
    PLAYER_TRANSFER_COMPLETED: `Le transfert du joueur ${transfer.playerId} vers ${transfer.toTeamId} est homologué.`,
  };

  await Promise.all(
    [transfer.fromTeamId, transfer.toTeamId].map((teamId) =>
      notify({
        eventId: `player-transfer:${transfer.id}:${type}:${teamId}`,
        type,
        target: { type: "TEAM", teamId },
        teamId,
        category: "SPORT",
        title: titleByType[type],
        body: bodyByType[type],
        data: commonData,
      }),
    ),
  );
}

/** Club source : crée une demande PENDING sans modifier l'effectif. */
export async function createTransfer(input: CreateTransferInput): Promise<PlayerTransfer> {
  const dataSource = await getDataSource();

  if (!input.seasonId) throw new PlayerTransferError("seasonId est obligatoire pour contrôler la fenêtre de transfert");
  const openWindow = await findOpenTransferWindow(dataSource, { teamId: input.fromTeamId, seasonId: input.seasonId });
  if (!openWindow) throw new PlayerTransferError("TRANSFER_WINDOW_CLOSED");

  if (input.fromTeamId === input.toTeamId) throw new PlayerTransferError("Le club source et le club destination doivent être différents");

  const player = await dataSource.getRepository(Player).findOne({ where: { id: input.playerId } });
  if (!player) throw new PlayerTransferError("Joueur introuvable");
  if (player.teamId !== input.fromTeamId) throw new PlayerTransferError("Le club source ne correspond pas au club actuel du joueur");

  const toTeam = await dataSource.getRepository(Team).findOne({ where: { id: input.toTeamId } });
  if (!toTeam) throw new PlayerTransferError("Club destination introuvable");

  try {
    await assertTransferRepresentation(dataSource, input);
  } catch (error) {
    throw new PlayerTransferError(error instanceof Error ? error.message : "Mandat de représentation invalide");
  }

  const repo = dataSource.getRepository(PlayerTransfer);
  const existing = await repo.findOne({ where: { playerId: input.playerId, fromTeamId: input.fromTeamId, toTeamId: input.toTeamId, status: "PENDING" } });
  if (existing) throw new PlayerTransferError("Une demande de transfert identique est déjà en attente");

  const transfer = await repo.save(repo.create({
    id: randomUUID(), playerId: input.playerId, fromTeamId: input.fromTeamId, toTeamId: input.toTeamId,
    transferType: input.transferType, status: "PENDING", effectiveDate: input.effectiveDate,
    seasonId: input.seasonId ?? null, fee: input.fee ?? null, currency: input.currency ?? null,
    loanStartDate: input.loanStartDate ?? null, loanEndDate: input.loanEndDate ?? null, notes: input.notes ?? null,
    agentId: input.agentId ?? null, representationAgreementId: input.representationAgreementId ?? null,
    intermediaryDeclaration: input.intermediaryDeclaration?.trim() || null,
    createdBy: input.createdBy ?? null, transferWindowId: openWindow.id,
  }));

  await emitTransferNotification(transfer, "PLAYER_TRANSFER_REQUESTED");
  return transfer;
}

/** Club destination : confirme une demande avant homologation fédérale. */
export async function approveDestinationTransfer(transferId: string, approvedBy: string): Promise<PlayerTransfer> {
  const dataSource = await getDataSource();
  const repo = dataSource.getRepository(PlayerTransfer);
  const transfer = await repo.findOne({ where: { id: transferId } });
  if (!transfer) throw new PlayerTransferError("Transfert introuvable");
  if (transfer.status !== "PENDING") throw new PlayerTransferError("Seul un transfert PENDING peut être approuvé par le club destination");
  transfer.status = "APPROVED";
  transfer.approvedBy = approvedBy;
  transfer.destinationApprovedBy = approvedBy;
  transfer.destinationApprovedAt = new Date();
  const saved = await repo.save(transfer);
  await emitTransferNotification(saved, "PLAYER_TRANSFER_APPROVED");
  return saved;
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

/** Fédération : homologue uniquement un transfert déjà APPROVED. */
export async function completeTransfer(transferId: string, homologatedBy?: string | null, exception?: { reason?: string|null; legalReference?: string|null; ipAddress?: string|null; userAgent?: string|null }): Promise<PlayerTransfer> {
  const dataSource = await getDataSource();
  const completed = await dataSource.transaction(async (manager) => {
    const transferRepo = manager.getRepository(PlayerTransfer);
    const transfer = await transferRepo.createQueryBuilder("transfer").setLock("pessimistic_write").where("transfer.id=:id", { id: transferId }).getOne();
    if (!transfer) throw new PlayerTransferError("Transfert introuvable");
    if (transfer.status === "COMPLETED") throw new PlayerTransferError("Ce transfert est déjà complété");
    if (transfer.status !== "APPROVED") throw new PlayerTransferError("Le club destination doit approuver le transfert avant homologation fédérale");

    const transferBan = await hasActiveTransferBan(transfer.toTeamId);
    if (transferBan) throw new PlayerTransferError("Le club destination fait l'objet d'une interdiction de recrutement (sanction fédérale active)");

    try {
      await assertTransferRepresentation(manager, transfer);
    } catch (error) {
      throw new PlayerTransferError(error instanceof Error ? error.message : "Mandat de représentation invalide");
    }

    if (!transfer.seasonId) throw new PlayerTransferError("seasonId manquant");
    const openWindow = await findOpenTransferWindow(dataSource, { teamId: transfer.fromTeamId, seasonId: transfer.seasonId });
    if (!openWindow) {
      try { assertTransferException(exception); } catch { throw new PlayerTransferError("TRANSFER_WINDOW_CLOSED"); }
      if (!homologatedBy) throw new PlayerTransferError("Auteur fédéral obligatoire pour l'exception");
      const exceptionId = randomUUID();
      await manager.query("INSERT INTO transfer_window_exceptions (id, transfer_id, reason, legal_reference, approved_by, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)", [exceptionId, transfer.id, exception!.reason!.trim(), exception!.legalReference!.trim(), homologatedBy, exception?.ipAddress ?? null, exception?.userAgent ?? null]);
      transfer.transferWindowExceptionId = exceptionId;
    } else {
      transfer.transferWindowId = openWindow.id;
    }

    const playerRepo = manager.getRepository(Player);
    const player = await playerRepo.findOne({ where: { id: transfer.playerId } });
    if (!player) throw new PlayerTransferError("Joueur introuvable");
    if (player.teamId !== transfer.fromTeamId) throw new PlayerTransferError("Le joueur n'appartient plus au club source indiqué par ce transfert (déjà transféré ailleurs ?)");

    await closeCurrentMembership(manager, transfer.fromTeamId, transfer.playerId, transfer.effectiveDate);
    const memberRepo = manager.getRepository(TeamMember);
    await memberRepo.save(memberRepo.create({ teamId: transfer.toTeamId, playerId: transfer.playerId, status: "ACTIVE", startDate: new Date(transfer.effectiveDate) }));
    player.teamId = transfer.toTeamId;
    await playerRepo.save(player);

    transfer.status = "COMPLETED";
    transfer.homologatedBy = homologatedBy ?? null;
    transfer.homologatedAt = new Date();
    return transferRepo.save(transfer);
  });

  await emitTransferNotification(completed, "PLAYER_TRANSFER_COMPLETED");
  return completed;
}

export interface CloseTransferInput { status: "CANCELLED" | "REJECTED"; reason?: string | null; }

export async function closeTransfer(transferId: string, input: CloseTransferInput): Promise<PlayerTransfer> {
  const dataSource = await getDataSource();
  const repo = dataSource.getRepository(PlayerTransfer);
  const transfer = await repo.findOne({ where: { id: transferId } });
  if (!transfer) throw new PlayerTransferError("Transfert introuvable");
  if (transfer.status === "COMPLETED") throw new PlayerTransferError("Un transfert déjà complété ne peut pas être annulé/rejeté");
  transfer.status = input.status;
  transfer.statusReason = input.reason ?? null;
  const saved = await repo.save(transfer);
  if (input.status === "REJECTED") await emitTransferNotification(saved, "PLAYER_TRANSFER_REJECTED");
  return saved;
}

export async function getTransferById(transferId: string): Promise<PlayerTransfer | null> {
  const dataSource = await getDataSource();
  return dataSource.getRepository(PlayerTransfer).findOne({ where: { id: transferId } });
}

export async function listTransfers(status?: PlayerTransferStatus, limit = 200): Promise<PlayerTransfer[]> {
  const dataSource = await getDataSource();
  return dataSource.getRepository(PlayerTransfer).find({ where: status ? { status } : {}, order: { createdAt: "DESC" }, take: limit });
}

export async function listTransfersForTeam(teamId: string, limit = 200): Promise<PlayerTransfer[]> {
  const dataSource = await getDataSource();
  return dataSource.getRepository(PlayerTransfer).createQueryBuilder("transfer")
    .where("transfer.fromTeamId = :teamId OR transfer.toTeamId = :teamId", { teamId })
    .orderBy("transfer.createdAt", "DESC").take(limit).getMany();
}
