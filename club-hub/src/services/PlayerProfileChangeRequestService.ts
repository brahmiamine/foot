import { randomUUID } from "node:crypto";
import type { EntityManager } from "typeorm";
import { getDataSource } from "@/lib/database";
import { Player } from "@/entities/Player";
import { updatePlayerSchema, type UpdatePlayerInput } from "@/types/players";
import { NotificationOutboxService } from "@/services/NotificationOutboxService";

export type PlayerProfileRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "STALE" | "AUTO_APPLIED";
export type PlayerProfileChangeSet = Partial<{
  imageUrl: string | null;
  firstNameFr: string;
  lastNameFr: string;
  firstNameAr: string | null;
  lastNameAr: string | null;
  birthDate: string | null;
  position: "GOALKEEPER" | "DEFENDER" | "MIDFIELDER" | "FORWARD" | null;
  number: number;
  category: string;
}>;

export interface PlayerProfileRequestView {
  id: string;
  teamId: string;
  playerId: string;
  requesterUserId: string;
  status: PlayerProfileRequestStatus;
  requestedChanges: PlayerProfileChangeSet;
  beforeSnapshot: PlayerProfileChangeSet;
  reviewerUserId: string | null;
  reviewReason: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  playerName?: string;
  currentCategory?: string;
}

interface RawRequestRow {
  id: string;
  team_id: string;
  player_id: string;
  requester_user_id: string;
  status: PlayerProfileRequestStatus;
  requested_changes: string | PlayerProfileChangeSet;
  before_snapshot: string | PlayerProfileChangeSet;
  reviewer_user_id: string | null;
  review_reason: string | null;
  resolved_at: Date | null;
  created_at: Date;
  updated_at: Date;
  firstNameFr?: string;
  lastNameFr?: string;
  category?: string;
}

const SENSITIVE_FIELDS = [
  "firstNameFr",
  "lastNameFr",
  "firstNameAr",
  "lastNameAr",
  "birthDate",
  "position",
  "number",
  "category",
] as const;

type SensitiveField = (typeof SENSITIVE_FIELDS)[number];

function parseJson<T>(value: string | T): T {
  if (typeof value === "string") return JSON.parse(value) as T;
  return value;
}

function view(row: RawRequestRow): PlayerProfileRequestView {
  return {
    id: row.id,
    teamId: row.team_id,
    playerId: row.player_id,
    requesterUserId: row.requester_user_id,
    status: row.status,
    requestedChanges: parseJson(row.requested_changes),
    beforeSnapshot: parseJson(row.before_snapshot),
    reviewerUserId: row.reviewer_user_id,
    reviewReason: row.review_reason,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    playerName: row.firstNameFr ? `${row.firstNameFr} ${row.lastNameFr ?? ""}`.trim() : undefined,
    currentCategory: row.category,
  };
}

function dateOnly(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function comparable(value: unknown): unknown {
  if (value instanceof Date) return dateOnly(value);
  return value;
}

function snapshot(player: Player, fields: readonly SensitiveField[]): PlayerProfileChangeSet {
  const result: PlayerProfileChangeSet = {};
  for (const field of fields) {
    if (field === "birthDate") result.birthDate = dateOnly(player.birthDate);
    else (result as Record<string, unknown>)[field] = comparable((player as unknown as Record<string, unknown>)[field]);
  }
  return result;
}

function normalizeSensitiveChanges(input: PlayerProfileChangeSet): {
  persisted: PlayerProfileChangeSet;
  update: UpdatePlayerInput;
} {
  const persisted: PlayerProfileChangeSet = {};
  const updateCandidate: Record<string, unknown> = {};
  for (const field of SENSITIVE_FIELDS) {
    if (!(field in input)) continue;
    const value = input[field];
    if (field === "birthDate") {
      const normalized = value == null || value === "" ? null : String(value).slice(0, 10);
      persisted.birthDate = normalized;
      updateCandidate.birthDate = normalized ? new Date(`${normalized}T00:00:00.000Z`) : null;
    } else {
      (persisted as Record<string, unknown>)[field] = value;
      updateCandidate[field] = value;
    }
  }
  return { persisted, update: updatePlayerSchema.parse(updateCandidate) };
}

function validateImageUrl(imageUrl: string | null): string | null {
  if (imageUrl == null || imageUrl.trim() === "") return null;
  const value = imageUrl.trim();
  if (value.length > 255) throw new Error("URL de photo trop longue");
  if (value.startsWith("/")) {
    if (value.startsWith("//")) throw new Error("URL de photo invalide");
    return value;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("URL de photo invalide");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("URL de photo invalide");
  return value;
}

async function lockPlayer(manager: EntityManager, playerId: string, teamId?: string): Promise<Player> {
  const query = manager.getRepository(Player)
    .createQueryBuilder("player")
    .setLock("pessimistic_write")
    .where("player.id = :playerId", { playerId });
  if (teamId) query.andWhere("player.teamId = :teamId", { teamId });
  const player = await query.getOne();
  if (!player) throw new Error("Joueur non trouvé");
  return player;
}

function isRequestStale(request: PlayerProfileRequestView, player: Player): boolean {
  const fields = Object.keys(request.beforeSnapshot) as SensitiveField[];
  const current = snapshot(player, fields);
  return fields.some((field) => comparable(current[field]) !== comparable(request.beforeSnapshot[field]));
}

async function appendDecisionAudit(
  manager: EntityManager,
  reviewerUserId: string,
  request: PlayerProfileRequestView,
  status: "APPROVED" | "REJECTED" | "STALE",
  reason?: string | null,
): Promise<void> {
  await manager.query(
    `INSERT INTO AuditLog (id, userId, action, entity, entityId, before, after, createdAt)
     VALUES (?, ?, 'UPDATE', 'PlayerProfileChangeRequest', ?, ?, ?, NOW(3))`,
    [
      randomUUID(),
      reviewerUserId,
      request.id,
      JSON.stringify({ status: request.status, requestedChanges: request.requestedChanges, beforeSnapshot: request.beforeSnapshot }),
      JSON.stringify({ status, playerId: request.playerId, reason: reason ?? null }),
    ],
  );
}

export class PlayerProfileChangeRequestService {
  private readonly outbox = new NotificationOutboxService();

  async updateDirectImage(playerId: string, requesterUserId: string, imageUrl: string | null): Promise<PlayerProfileRequestView | null> {
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const player = await lockPlayer(manager, playerId);
      const normalized = validateImageUrl(imageUrl);
      if ((player.imageUrl ?? null) === normalized) return null;
      const before = { imageUrl: player.imageUrl ?? null };
      player.imageUrl = normalized;
      await manager.getRepository(Player).save(player);
      const id = randomUUID();
      await manager.query(
        `INSERT INTO cms_player_profile_change_requests
          (id, team_id, player_id, requester_user_id, status, requested_changes, before_snapshot, reviewer_user_id, review_reason, resolved_at)
         VALUES (?, ?, ?, ?, 'AUTO_APPLIED', ?, ?, NULL, NULL, NOW())`,
        [id, player.teamId, player.id, requesterUserId, JSON.stringify({ imageUrl: normalized }), JSON.stringify(before)],
      );
      const rows = await manager.query(`SELECT * FROM cms_player_profile_change_requests WHERE id = ?`, [id]) as RawRequestRow[];
      return view(rows[0]);
    });
  }

  async submitSensitiveChanges(
    playerId: string,
    requesterUserId: string,
    input: PlayerProfileChangeSet,
  ): Promise<PlayerProfileRequestView> {
    const { persisted } = normalizeSensitiveChanges(input);
    if (Object.keys(persisted).length === 0) throw new Error("Aucune modification sensible demandée");

    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const player = await lockPlayer(manager, playerId);
      const requestedFields = Object.keys(persisted) as SensitiveField[];
      const snapshotFields = requestedFields.includes("category")
        ? requestedFields
        : [...requestedFields, "category" as const];
      const before = snapshot(player, snapshotFields);
      const changed = requestedFields.some((field) => comparable(before[field]) !== comparable(persisted[field]));
      if (!changed) throw new Error("La demande ne contient aucune modification");

      const pending = await manager.query(
        `SELECT id FROM cms_player_profile_change_requests
         WHERE team_id = ? AND player_id = ? AND status = 'PENDING'
         ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
        [player.teamId, player.id],
      ) as Array<{ id: string }>;
      if (pending.length > 0) throw new Error("Une demande de modification est déjà en attente");

      const id = randomUUID();
      await manager.query(
        `INSERT INTO cms_player_profile_change_requests
          (id, team_id, player_id, requester_user_id, status, requested_changes, before_snapshot, reviewer_user_id, review_reason, resolved_at)
         VALUES (?, ?, ?, ?, 'PENDING', ?, ?, NULL, NULL, NULL)`,
        [id, player.teamId, player.id, requesterUserId, JSON.stringify(persisted), JSON.stringify(before)],
      );
      const rows = await manager.query(`SELECT * FROM cms_player_profile_change_requests WHERE id = ?`, [id]) as RawRequestRow[];
      return view(rows[0]);
    });
  }

  async listForPlayer(playerId: string, requesterUserId: string): Promise<PlayerProfileRequestView[]> {
    const ds = await getDataSource();
    const rows = await ds.query(
      `SELECT r.* FROM cms_player_profile_change_requests r
       WHERE r.player_id = ? AND r.requester_user_id = ?
       ORDER BY r.created_at DESC LIMIT 50`,
      [playerId, requesterUserId],
    ) as RawRequestRow[];
    return rows.map(view);
  }

  async listPendingForTeam(teamId: string): Promise<PlayerProfileRequestView[]> {
    const ds = await getDataSource();
    const rows = await ds.query(
      `SELECT r.*, p.firstNameFr, p.lastNameFr, p.category
       FROM cms_player_profile_change_requests r
       JOIN Player p ON p.id = r.player_id AND p.teamId = r.team_id
       WHERE r.team_id = ? AND r.status = 'PENDING'
       ORDER BY r.created_at ASC`,
      [teamId],
    ) as RawRequestRow[];
    return rows.map(view);
  }

  async findById(id: string, teamId: string): Promise<PlayerProfileRequestView | null> {
    const ds = await getDataSource();
    const rows = await ds.query(
      `SELECT r.*, p.firstNameFr, p.lastNameFr, p.category
       FROM cms_player_profile_change_requests r
       JOIN Player p ON p.id = r.player_id AND p.teamId = r.team_id
       WHERE r.id = ? AND r.team_id = ? LIMIT 1`,
      [id, teamId],
    ) as RawRequestRow[];
    return rows[0] ? view(rows[0]) : null;
  }

  async approve(id: string, teamId: string, reviewerUserId: string): Promise<PlayerProfileRequestView> {
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const rows = await manager.query(
        `SELECT * FROM cms_player_profile_change_requests WHERE id = ? AND team_id = ? FOR UPDATE`,
        [id, teamId],
      ) as RawRequestRow[];
      const row = rows[0];
      if (!row) throw new Error("Demande introuvable");
      if (row.status !== "PENDING") throw new Error("Cette demande n'est plus en attente");
      if (row.requester_user_id === reviewerUserId) throw new Error("Le demandeur ne peut pas approuver sa propre demande");

      const request = view(row);
      const player = await lockPlayer(manager, request.playerId, teamId);
      if (isRequestStale(request, player)) {
        const reason = "La fiche joueur a changé depuis la demande";
        await manager.query(
          `UPDATE cms_player_profile_change_requests
           SET status = 'STALE', reviewer_user_id = ?, review_reason = ?, resolved_at = NOW(), updated_at = NOW()
           WHERE id = ? AND team_id = ?`,
          [reviewerUserId, reason, id, teamId],
        );
        await appendDecisionAudit(manager, reviewerUserId, request, "STALE", reason);
        await this.outbox.enqueue(manager, {
          eventId: `player-profile:${id}:stale`,
          type: "PLAYER_PROFILE_CHANGE_STALE",
          userId: request.requesterUserId,
          teamId,
          title: "Demande de profil à renouveler",
          body: "Votre fiche a changé depuis votre demande. Merci de soumettre une nouvelle demande.",
          data: { requestId: id, playerId: request.playerId },
        });
      } else {
        const { update } = normalizeSensitiveChanges(request.requestedChanges);
        Object.assign(player, update);
        await manager.getRepository(Player).save(player);
        await manager.query(
          `UPDATE cms_player_profile_change_requests
           SET status = 'APPROVED', reviewer_user_id = ?, review_reason = NULL, resolved_at = NOW(), updated_at = NOW()
           WHERE id = ? AND team_id = ?`,
          [reviewerUserId, id, teamId],
        );
        await appendDecisionAudit(manager, reviewerUserId, request, "APPROVED");
        await this.outbox.enqueue(manager, {
          eventId: `player-profile:${id}:approved`,
          type: "PLAYER_PROFILE_CHANGE_APPROVED",
          userId: request.requesterUserId,
          teamId,
          title: "Modification de profil approuvée",
          body: "Votre club a approuvé et appliqué votre demande de modification de profil.",
          data: { requestId: id, playerId: request.playerId },
        });
      }
      const finalRows = await manager.query(`SELECT * FROM cms_player_profile_change_requests WHERE id = ?`, [id]) as RawRequestRow[];
      return view(finalRows[0]);
    });
  }

  async reject(id: string, teamId: string, reviewerUserId: string, reason: string): Promise<PlayerProfileRequestView> {
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 3) throw new Error("Le motif de rejet est obligatoire");
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const rows = await manager.query(
        `SELECT * FROM cms_player_profile_change_requests WHERE id = ? AND team_id = ? FOR UPDATE`,
        [id, teamId],
      ) as RawRequestRow[];
      const row = rows[0];
      if (!row) throw new Error("Demande introuvable");
      if (row.status !== "PENDING") throw new Error("Cette demande n'est plus en attente");
      if (row.requester_user_id === reviewerUserId) throw new Error("Le demandeur ne peut pas rejeter sa propre demande");

      const request = view(row);
      const player = await lockPlayer(manager, request.playerId, teamId);
      if (isRequestStale(request, player)) {
        const staleReason = "La fiche joueur a changé depuis la demande";
        await manager.query(
          `UPDATE cms_player_profile_change_requests
           SET status = 'STALE', reviewer_user_id = ?, review_reason = ?, resolved_at = NOW(), updated_at = NOW()
           WHERE id = ? AND team_id = ?`,
          [reviewerUserId, staleReason, id, teamId],
        );
        await appendDecisionAudit(manager, reviewerUserId, request, "STALE", staleReason);
        await this.outbox.enqueue(manager, {
          eventId: `player-profile:${id}:stale`,
          type: "PLAYER_PROFILE_CHANGE_STALE",
          userId: request.requesterUserId,
          teamId,
          title: "Demande de profil à renouveler",
          body: "Votre fiche a changé depuis votre demande. Merci de soumettre une nouvelle demande.",
          data: { requestId: id, playerId: request.playerId },
        });
      } else {
        await manager.query(
          `UPDATE cms_player_profile_change_requests
           SET status = 'REJECTED', reviewer_user_id = ?, review_reason = ?, resolved_at = NOW(), updated_at = NOW()
           WHERE id = ? AND team_id = ?`,
          [reviewerUserId, normalizedReason, id, teamId],
        );
        await appendDecisionAudit(manager, reviewerUserId, request, "REJECTED", normalizedReason);
        await this.outbox.enqueue(manager, {
          eventId: `player-profile:${id}:rejected`,
          type: "PLAYER_PROFILE_CHANGE_REJECTED",
          userId: row.requester_user_id,
          teamId,
          title: "Modification de profil refusée",
          body: `Votre club a refusé votre demande : ${normalizedReason}`,
          data: { requestId: id, playerId: row.player_id },
        });
      }
      const finalRows = await manager.query(`SELECT * FROM cms_player_profile_change_requests WHERE id = ?`, [id]) as RawRequestRow[];
      return view(finalRows[0]);
    });
  }
}
