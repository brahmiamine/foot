import { In } from "typeorm";
import { getDataSource } from "@/lib/database";
import { Match } from "@/entities/Match";
import { Ticket } from "@/entities/Ticket";
import { MatchCancellationRefund, MatchCancellationRefundStatus } from "@/entities/MatchCancellationRefund";
import { getRefundStatus, requestRefund } from "@/lib/paymentApiClient";
import { releaseTickets } from "@/lib/tickets";

// Même seuil que stockUnavailableRefunds.ts (TASK-P0-002) — dossier ouvert
// depuis plus de 24h sans résolution (ni SUCCEEDED ni FAILED) signalé aux
// ops.
const OPS_ALERT_SLA_MS = 24 * 60 * 60 * 1000;
const TERMINAL_STATUSES = new Set<MatchCancellationRefundStatus>(["SUCCEEDED", "FAILED"]);

function isDuplicateKeyCode(code: unknown): boolean {
  return typeof code === "string" && (code === "ER_DUP_ENTRY" || code.startsWith("SQLITE_CONSTRAINT"));
}

function isDuplicateKeyError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const record = error as Record<string, unknown>;
  if (isDuplicateKeyCode(record.code)) return true;
  const driverError =
    typeof record.driverError === "object" && record.driverError !== null
      ? (record.driverError as Record<string, unknown>)
      : undefined;
  return isDuplicateKeyCode(driverError?.code);
}

/** Retourne le nouveau statut en cas de succès, `null` si la demande a échoué (dossier laissé tel quel). */
async function tryRequestRefund(dossier: MatchCancellationRefund): Promise<MatchCancellationRefundStatus | null> {
  const ds = await getDataSource();
  const repo = ds.getRepository(MatchCancellationRefund);

  try {
    const refund = await requestRefund({
      paymentId: dossier.paymentId,
      reason: "Match annulé : remboursement des billets déjà payés.",
      idempotencyKey: `match-cancelled:${dossier.paymentId}`,
    });
    await repo.update(
      { id: dossier.id },
      {
        refundId: refund.id,
        refundStatus: refund.status,
        lastCheckedAt: new Date(),
        resolvedAt: TERMINAL_STATUSES.has(refund.status) ? new Date() : null,
      },
    );
    return refund.status;
  } catch (error) {
    console.error(`[match-cancellation-refund] échec de la demande de remboursement pour le paiement ${dossier.paymentId} :`, error);
    return null;
  }
}

async function openRefundCase(matchId: string, paymentId: string): Promise<void> {
  const ds = await getDataSource();
  const repo = ds.getRepository(MatchCancellationRefund);

  let dossier = await repo.findOne({ where: { paymentId } });
  if (!dossier) {
    dossier = repo.create({ matchId, paymentId, refundId: null, refundStatus: "PENDING_REFUND_REQUEST" });
    try {
      await repo.save(dossier);
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        console.error(`[match-cancellation-refund] échec de l'ouverture du dossier pour le paiement ${paymentId} :`, error);
        return;
      }
      // Course avec un appel concurrent (ex. scheduler + rejeu explicite en
      // même temps) : le dossier existe déjà, rien de plus à faire ici.
      return;
    }
  }

  if (dossier.refundStatus !== "PENDING_REFUND_REQUEST") return; // déjà demandé
  await tryRequestRefund(dossier);
}

export interface CancelMatchTicketsResult {
  ticketsReleased: number;
  refundCasesOpened: number;
}

/**
 * TASK-P0-003 (todo.md) : réagit à un match passé `CANCELLED` (écrit par
 * superadmin, `matches` étant une table partagée — voir db/OWNERSHIP.md) en
 * fermant la vente et en ouvrant un dossier de remboursement pour chaque
 * paiement déjà PAID sur ce match. Idempotente de bout en bout : les
 * billets déjà CANCELLED/USED sont ignorés (WHERE status = 'PENDING'), et
 * `openRefundCase` ne redemande jamais un remboursement déjà en cours (même
 * garde qu'`openStockUnavailableRefundCase`, TASK-P0-002). Appelable
 * directement par l'action d'annulation côté superadmin (idempotencyKey
 * portée par payment-api, pas ici) et par le scheduler périodique
 * (processMatchCancellationRefunds) en filet de sécurité.
 */
export async function cancelMatchTickets(matchId: string): Promise<CancelMatchTicketsResult> {
  const ds = await getDataSource();
  const ticketRepo = ds.getRepository(Ticket);

  const pendingTickets = await ticketRepo.find({ where: { matchId, status: "PENDING" } });
  const byCategory = new Map<string, string[]>();
  for (const ticket of pendingTickets) {
    const ids = byCategory.get(ticket.matchTicketCategoryId) ?? [];
    ids.push(ticket.id);
    byCategory.set(ticket.matchTicketCategoryId, ids);
  }
  for (const ticketIds of byCategory.values()) {
    await ds.transaction((manager) => releaseTickets(manager, ticketIds));
  }

  const paidTickets = await ticketRepo.find({ where: { matchId, status: "PAID" } });
  const paymentIds = Array.from(
    new Set(paidTickets.map((t) => t.paymentId).filter((id): id is string => !!id)),
  );
  for (const paymentId of paymentIds) {
    await openRefundCase(matchId, paymentId);
  }

  return { ticketsReleased: pendingTickets.length, refundCasesOpened: paymentIds.length };
}

export interface MatchCancellationRefundReport {
  matchesScanned: number;
  ticketsReleased: number;
  refundCasesOpened: number;
  retriedRequests: number;
  refreshed: number;
  resolved: number;
  alerted: number;
  timestamp: string;
}

/**
 * TASK-P0-003 (todo.md) : filet de sécurité périodique, même esprit que
 * processStockUnavailableRefunds (TASK-P0-002). Deux responsabilités :
 * (1) rattraper tout match CANCELLED dont des billets PENDING/PAID
 *     n'auraient pas encore été traités — couvre le cas où l'appel
 *     synchrone déclenché par superadmin (voir README) a échoué ou n'a
 *     jamais eu lieu (ex. billetterie indisponible au moment de
 *     l'annulation) ;
 * (2) reprendre les dossiers dont la demande a échoué et rafraîchir ceux
 *     déjà demandés mais pas encore résolus, en relisant payment-api —
 *     jamais fait confiance au seul état local.
 */
export async function processMatchCancellationRefunds(): Promise<MatchCancellationRefundReport> {
  const ds = await getDataSource();
  const matchRepo = ds.getRepository(Match);
  const ticketRepo = ds.getRepository(Ticket);

  const cancelledMatches = await matchRepo.find({ where: { status: "CANCELLED" } });
  let matchesScanned = 0;
  let ticketsReleased = 0;
  let refundCasesOpened = 0;
  for (const match of cancelledMatches) {
    const stillPending = await ticketRepo.count({ where: { matchId: match.id, status: "PENDING" } });

    const paidTickets = await ticketRepo.find({ where: { matchId: match.id, status: "PAID" } });
    const paidPaymentIds = new Set(paidTickets.map((t) => t.paymentId).filter((id): id is string => !!id));
    const dossierCount =
      paidPaymentIds.size === 0
        ? 0
        : await ds.getRepository(MatchCancellationRefund).count({ where: { paymentId: In([...paidPaymentIds]) } });
    const hasUnprocessedPaid = dossierCount < paidPaymentIds.size;

    if (stillPending === 0 && !hasUnprocessedPaid) continue;

    matchesScanned++;
    const result = await cancelMatchTickets(match.id);
    ticketsReleased += result.ticketsReleased;
    refundCasesOpened += result.refundCasesOpened;
  }

  const repo = ds.getRepository(MatchCancellationRefund);
  const open = await repo.find({
    where: [
      { refundStatus: "PENDING_REFUND_REQUEST" },
      { refundStatus: "REQUESTED" },
      { refundStatus: "PROCESSING" },
      { refundStatus: "MANUAL_REVIEW" },
    ],
  });

  let retriedRequests = 0;
  let refreshed = 0;
  let resolved = 0;
  let alerted = 0;
  const now = new Date();

  for (const dossier of open) {
    if (dossier.refundStatus === "PENDING_REFUND_REQUEST") {
      retriedRequests++;
      const newStatus = await tryRequestRefund(dossier);
      if (newStatus && TERMINAL_STATUSES.has(newStatus)) resolved++;
    } else if (dossier.refundId) {
      try {
        const status = await getRefundStatus(dossier.refundId);
        if (status !== "UNKNOWN" && status !== dossier.refundStatus) {
          refreshed++;
          const isTerminal = TERMINAL_STATUSES.has(status as MatchCancellationRefundStatus);
          await repo.update(
            { id: dossier.id },
            { refundStatus: status as MatchCancellationRefundStatus, lastCheckedAt: now, resolvedAt: isTerminal ? now : null },
          );
          if (isTerminal) resolved++;
        } else {
          await repo.update({ id: dossier.id }, { lastCheckedAt: now });
        }
      } catch (error) {
        console.error(`[match-cancellation-refund] échec de la relecture du statut pour le remboursement ${dossier.refundId} :`, error);
      }
    }

    const reloaded = await repo.findOne({ where: { id: dossier.id } });
    if (
      reloaded &&
      !reloaded.resolvedAt &&
      !reloaded.opsAlertedAt &&
      now.getTime() - reloaded.detectedAt.getTime() > OPS_ALERT_SLA_MS
    ) {
      console.error(
        JSON.stringify({
          event: "match_cancellation_refund_sla_breach",
          dossierId: reloaded.id,
          matchId: reloaded.matchId,
          paymentId: reloaded.paymentId,
          refundId: reloaded.refundId,
          refundStatus: reloaded.refundStatus,
          detectedAt: reloaded.detectedAt.toISOString(),
          timestamp: now.toISOString(),
        }),
      );
      await repo.update({ id: reloaded.id }, { opsAlertedAt: now });
      alerted++;
    }
  }

  return { matchesScanned, ticketsReleased, refundCasesOpened, retriedRequests, refreshed, resolved, alerted, timestamp: now.toISOString() };
}
