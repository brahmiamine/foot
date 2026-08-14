import { getDataSource } from "@/lib/database";
import { StockUnavailableRefund, StockUnavailableRefundStatus } from "@/entities/StockUnavailableRefund";
import { getRefundStatus, requestRefund } from "@/lib/paymentApiClient";

// Au-delà de ce délai sans résolution (ni SUCCEEDED ni FAILED), le dossier
// est considéré en dépassement de SLA et signalé aux ops (voir
// processStockUnavailableRefunds) — même seuil que
// ticketing/src/lib/stockUnavailableRefunds.ts.
const OPS_ALERT_SLA_MS = 24 * 60 * 60 * 1000;

const TERMINAL_STATUSES = new Set(["SUCCEEDED", "FAILED"]);

function isDuplicateKeyCode(code: unknown): boolean {
  // MySQL/MariaDB : ER_DUP_ENTRY. better-sqlite3 (tests) : SQLITE_CONSTRAINT_*.
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

/**
 * TASK-P0-002 (todo.md). Ouvre (ou retrouve, idempotent — un seul dossier
 * par paiement) le dossier de réconciliation pour un paiement confirmé
 * après restockage (PAID_STOCK_UNAVAILABLE, voir reconcileOrderPayment dans
 * src/services/ShopOrderService.ts, seul appelant) et tente immédiatement
 * la demande de remboursement auprès de payments. Ne lève jamais : un
 * payments indisponible laisse le dossier à PENDING_REFUND_REQUEST,
 * repris par processStockUnavailableRefunds() (scheduler) —
 * reconcileOrderPayment ne doit jamais échouer à cause de ce traitement
 * best-effort. Même implémentation que
 * ticketing/src/lib/stockUnavailableRefunds.ts.
 */
export async function openStockUnavailableRefundCase(paymentId: string): Promise<void> {
  const ds = await getDataSource();
  const repo = ds.getRepository(StockUnavailableRefund);

  let dossier = await repo.findOne({ where: { paymentId } });
  if (!dossier) {
    dossier = repo.create({ paymentId, refundId: null, refundStatus: "PENDING_REFUND_REQUEST" });
    try {
      await repo.save(dossier);
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        console.error(`[stock-unavailable-refund] échec de l'ouverture du dossier pour le paiement ${paymentId} :`, error);
        return;
      }
      // Course avec un appel concurrent (déjà créé entre-temps) : rien de
      // plus à faire, le dossier existant sera traité par le scheduler s'il
      // n'a pas encore de remboursement demandé.
      return;
    }
  }

  if (dossier.refundStatus !== "PENDING_REFUND_REQUEST") return; // déjà demandé
  await tryRequestRefund(dossier);
}

/** Retourne le nouveau statut en cas de succès, `null` si la demande a échoué (dossier laissé tel quel). */
async function tryRequestRefund(dossier: StockUnavailableRefund): Promise<StockUnavailableRefundStatus | null> {
  const ds = await getDataSource();
  const repo = ds.getRepository(StockUnavailableRefund);

  try {
    const refund = await requestRefund({
      paymentId: dossier.paymentId,
      reason: "Paiement confirmé après restockage (stock indisponible).",
      idempotencyKey: `stock-unavailable:${dossier.paymentId}`,
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
    console.error(`[stock-unavailable-refund] échec de la demande de remboursement pour le paiement ${dossier.paymentId} :`, error);
    return null;
  }
}

export interface StockUnavailableRefundReport {
  retriedRequests: number;
  refreshed: number;
  resolved: number;
  alerted: number;
  timestamp: string;
}

/**
 * TASK-P0-002 (todo.md). Reprend les dossiers dont la demande de
 * remboursement a échoué (PENDING_REFUND_REQUEST) et rafraîchit le statut de
 * ceux déjà demandés mais pas encore résolus (REQUESTED/PROCESSING/
 * MANUAL_REVIEW) en relisant payments — jamais fait confiance à l'état
 * local seul, qui peut avoir divergé (ex. un opérateur a confirmé le
 * remboursement manuel côté payments entre-temps). Alerte (log
 * structuré, pas d'intégration Slack/pager dans ce repo — voir
 * TASK-P2-002) les dossiers ouverts depuis plus de OPS_ALERT_SLA_MS et pas
 * encore signalés. Appelée par le scheduler in-process (instrumentation.ts).
 */
export async function processStockUnavailableRefunds(): Promise<StockUnavailableRefundReport> {
  const ds = await getDataSource();
  const repo = ds.getRepository(StockUnavailableRefund);

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
          const isTerminal = TERMINAL_STATUSES.has(status);
          await repo.update(
            { id: dossier.id },
            { refundStatus: status, lastCheckedAt: now, resolvedAt: isTerminal ? now : null },
          );
          if (isTerminal) resolved++;
        } else {
          await repo.update({ id: dossier.id }, { lastCheckedAt: now });
        }
      } catch (error) {
        console.error(`[stock-unavailable-refund] échec de la relecture du statut pour le remboursement ${dossier.refundId} :`, error);
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
          event: "stock_unavailable_refund_sla_breach",
          dossierId: reloaded.id,
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

  return { retriedRequests, refreshed, resolved, alerted, timestamp: now.toISOString() };
}
