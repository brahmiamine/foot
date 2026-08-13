import { In, LessThan } from "typeorm";
import { getDataSource } from "@/lib/database";
import { Team } from "@/entities/Team";
import { SubscriptionCategory } from "@/entities/SubscriptionCategory";
import { Subscription } from "@/entities/Subscription";
import { SubscriptionScanLog } from "@/entities/SubscriptionScanLog";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { generateSubscriptionReference } from "@/lib/reference";
import { getPaymentProvider, getPaymentStatus, initPayment } from "@/lib/paymentApiClient";
import { fetchMemberProfile } from "@/lib/ssoProfileClient";
import { verifySubscriptionToken } from "@/lib/subscriptionQr";

/** Clé jour (UTC) utilisée pour comparer deux dates au jour civil près — voir scanSubscription. */
function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface OpenSubscriptionCategorySummary {
  id: string;
  clubId: string;
  clubName: string;
  clubNameAr: string | null;
  clubLogo: string | null;
  name: string;
  description: string | null;
  price: string;
  color: string | null;
  validFrom: Date;
  validUntil: Date;
}

// Catégories d'abonnement actives, toutes clubs confondus — même logique
// que listOpenMatches dans lib/tickets.ts, pas de duplication de `teams`.
export async function listOpenSubscriptionCategories(): Promise<OpenSubscriptionCategorySummary[]> {
  const ds = await getDataSource();
  const categories = await ds.getRepository(SubscriptionCategory).find({ where: { isActive: true }, order: { price: "ASC" } });
  if (categories.length === 0) return [];

  const clubIds = Array.from(new Set(categories.map((c) => c.clubId)));
  const clubs = await ds.getRepository(Team).find({ where: { id: In(clubIds) } });
  const clubById = new Map(clubs.map((c) => [c.id, c]));

  return categories.map((c) => {
    const club = clubById.get(c.clubId);
    return {
      id: c.id,
      clubId: c.clubId,
      clubName: club?.nom ?? "Club",
      clubNameAr: club?.nomAr ?? null,
      clubLogo: club?.logoUrl ?? null,
      name: c.name,
      description: c.description,
      price: c.price,
      color: c.color,
      validFrom: c.validFrom,
      validUntil: c.validUntil,
    };
  });
}

export async function getSubscriptionCategoryDetail(id: string): Promise<OpenSubscriptionCategorySummary | null> {
  const ds = await getDataSource();
  const category = await ds.getRepository(SubscriptionCategory).findOne({ where: { id, isActive: true } });
  if (!category) return null;
  const club = await ds.getRepository(Team).findOne({ where: { id: category.clubId } });
  return {
    id: category.id,
    clubId: category.clubId,
    clubName: club?.nom ?? "Club",
    clubNameAr: club?.nomAr ?? null,
    clubLogo: club?.logoUrl ?? null,
    name: category.name,
    description: category.description,
    price: category.price,
    color: category.color,
    validFrom: category.validFrom,
    validUntil: category.validUntil,
  };
}

export interface PurchaseSubscriptionInput {
  purchaserId: string;
  purchaserEmail?: string;
  subscriptionCategoryId: string;
  quantity: number;
}

export interface PurchaseSubscriptionResult {
  subscriptions: Subscription[];
  payUrl: string;
}

// Même délai que PENDING_RESERVATION_TTL_MS dans lib/tickets.ts — voir
// purgeStalePendingSubscriptions.
const PENDING_RESERVATION_TTL_MS = 30 * 60 * 1000;

/**
 * Réserve les abonnements (PENDING) puis initie le paiement auprès de
 * payment-api — même schéma que purchaseTickets (lib/tickets.ts), en
 * nettement plus simple : pas de capacité/quota ni de règle d'audience à
 * vérifier, un abonnement n'est pas une place de stade rare vendue match
 * par match. Si l'initiation du paiement échoue, les réservations créées
 * sont libérées plutôt que laissées PENDING orphelines.
 */
export async function purchaseSubscription(input: PurchaseSubscriptionInput): Promise<PurchaseSubscriptionResult> {
  if (input.quantity < 1) {
    throw new ForbiddenError("La quantité doit être d'au moins 1 abonnement.");
  }

  let paymeeProfile: { firstName: string; lastName: string; phoneNumber: string } | undefined;
  if (getPaymentProvider() === "paymee") {
    const profile = await fetchMemberProfile();
    if (!profile?.firstName || !profile.lastName || !profile.phoneNumber) {
      throw new ForbiddenError(
        "Complétez votre prénom, nom et téléphone dans votre profil (espace membre) avant de payer par Paymee.",
      );
    }
    paymeeProfile = {
      firstName: profile.firstName,
      lastName: profile.lastName,
      phoneNumber: profile.phoneNumber,
    };
  }

  const ds = await getDataSource();
  const category = await ds.getRepository(SubscriptionCategory).findOne({ where: { id: input.subscriptionCategoryId, isActive: true } });
  if (!category) throw new NotFoundError("Catégorie d'abonnement introuvable.");

  const subRepo = ds.getRepository(Subscription);
  const subscriptions = await subRepo.save(
    Array.from({ length: input.quantity }, () =>
      subRepo.create({
        subscriptionCategoryId: category.id,
        organizerTeamId: category.clubId,
        purchaserId: input.purchaserId,
        status: "PENDING",
        reference: generateSubscriptionReference(),
        price: category.price,
        validFrom: category.validFrom,
        validUntil: category.validUntil,
        paymentId: null,
      }),
    ),
  );

  const totalAmount = Math.round(parseFloat(category.price) * input.quantity * 1000) / 1000;
  const orderId = subscriptions[0].reference;

  let paymentId: string;
  let payUrl: string;
  try {
    const result = await initPayment({
      orderId,
      amount: totalAmount,
      email: input.purchaserEmail,
      userId: input.purchaserId,
      ...paymeeProfile,
    });
    paymentId = result.paymentId;
    payUrl = result.payUrl;
  } catch (error) {
    await subRepo.update({ id: In(subscriptions.map((s) => s.id)) }, { status: "CANCELLED" });
    throw error;
  }

  await subRepo.update({ id: In(subscriptions.map((s) => s.id)) }, { paymentId });
  subscriptions.forEach((s) => {
    s.paymentId = paymentId;
  });

  return { subscriptions, payUrl };
}

export type ReconcileSubscriptionResult = "PAID" | "PENDING" | "CANCELLED";

/**
 * Voir reconcileTicketPayment (lib/tickets.ts) pour le principe général
 * (payment-api ne rappelle jamais billetterie, relecture explicite du
 * statut). Plus simple ici : un abonnement n'a pas de capacité à perdre
 * (produit non limité), donc pas d'équivalent PAID_STOCK_UNAVAILABLE — si
 * le paiement s'avère confirmé après qu'une réservation a expiré et été
 * purgée (CANCELLED), on relève simplement l'abonnement en PAID plutôt que
 * d'orpheliner le paiement.
 */
export async function reconcileSubscriptionPayment(paymentId: string): Promise<ReconcileSubscriptionResult> {
  const ds = await getDataSource();
  const subRepo = ds.getRepository(Subscription);

  const pending = await subRepo.find({ where: { paymentId, status: "PENDING" } });

  if (pending.length === 0) {
    const any = await subRepo.findOne({ where: { paymentId } });
    if (!any) return "CANCELLED";
    if (any.status === "PAID") return "PAID";

    const lateStatus = await getPaymentStatus(paymentId);
    if (lateStatus === "PAID") {
      any.status = "PAID";
      any.paidAt = new Date();
      await subRepo.save(any);
      return "PAID";
    }
    return "CANCELLED";
  }

  const status = await getPaymentStatus(paymentId);

  if (status === "PAID") {
    const paidAt = new Date();
    for (const sub of pending) {
      sub.status = "PAID";
      sub.paidAt = paidAt;
    }
    await subRepo.save(pending);
    return "PAID";
  }

  if (status === "FAILED" || status === "EXPIRED") {
    for (const sub of pending) sub.status = "CANCELLED";
    await subRepo.save(pending);
    return "CANCELLED";
  }

  return "PENDING";
}

export interface PurgeStaleSubscriptionsResult {
  releasedSubscriptions: number;
}

/** Voir purgeStalePendingTickets (lib/tickets.ts) — même rôle, sans capacité à libérer. */
export async function purgeStalePendingSubscriptions(): Promise<PurgeStaleSubscriptionsResult> {
  const ds = await getDataSource();
  const staleCutoff = new Date(Date.now() - PENDING_RESERVATION_TTL_MS);
  const result = await ds
    .getRepository(Subscription)
    .update({ status: "PENDING", createdAt: LessThan(staleCutoff) }, { status: "CANCELLED" });
  return { releasedSubscriptions: result.affected ?? 0 };
}

export interface MySubscription {
  id: string;
  reference: string;
  status: Subscription["status"];
  price: string;
  createdAt: Date;
  paidAt: Date | null;
  validFrom: Date;
  validUntil: Date;
  lastValidatedOn: Date | null;
  clubId: string;
  clubName: string;
  clubNameAr: string | null;
  categoryName: string;
  color: string | null;
}

export async function listMySubscriptions(purchaserId: string): Promise<MySubscription[]> {
  const ds = await getDataSource();
  const subRepo = ds.getRepository(Subscription);

  // Rattrapage opportuniste — même principe que listMyTickets.
  const pendingWithPayment = await subRepo.find({ where: { purchaserId, status: "PENDING" } });
  for (const sub of pendingWithPayment) {
    if (sub.paymentId) {
      await reconcileSubscriptionPayment(sub.paymentId).catch((error) => {
        console.error(`reconcileSubscriptionPayment failed for payment ${sub.paymentId}:`, error);
      });
    }
  }

  const subscriptions = await subRepo.find({ where: { purchaserId }, order: { createdAt: "DESC" } });
  if (subscriptions.length === 0) return [];

  const categoryIds = Array.from(new Set(subscriptions.map((s) => s.subscriptionCategoryId)));
  const categories = await ds.getRepository(SubscriptionCategory).find({ where: { id: In(categoryIds) } });
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const clubIds = Array.from(new Set(subscriptions.map((s) => s.organizerTeamId)));
  const clubs = await ds.getRepository(Team).find({ where: { id: In(clubIds) } });
  const clubById = new Map(clubs.map((c) => [c.id, c]));

  return subscriptions.map((s) => {
    const category = categoryById.get(s.subscriptionCategoryId);
    const club = clubById.get(s.organizerTeamId);
    return {
      id: s.id,
      reference: s.reference,
      status: s.status,
      price: s.price,
      createdAt: s.createdAt,
      paidAt: s.paidAt,
      validFrom: s.validFrom,
      validUntil: s.validUntil,
      lastValidatedOn: s.lastValidatedOn,
      clubId: s.organizerTeamId,
      clubName: club?.nom ?? "Club",
      clubNameAr: club?.nomAr ?? null,
      categoryName: category?.name ?? "Abonnement",
      color: category?.color ?? null,
    };
  });
}

/** Voir revokeTicket (lib/tickets.ts) — même sémantique de révocation ciblée. */
export async function revokeSubscription(subscriptionId: string, revokedBy: string, reason?: string): Promise<void> {
  const ds = await getDataSource();
  const subRepo = ds.getRepository(Subscription);
  const subscription = await subRepo.findOne({ where: { id: subscriptionId } });
  if (!subscription) {
    throw new NotFoundError("Abonnement introuvable.");
  }
  await subRepo.update(
    { id: subscriptionId },
    { revoked: true, revokedAt: new Date(), revokedReason: reason ?? null, revokedBy },
  );
}

export async function unrevokeSubscription(subscriptionId: string): Promise<void> {
  const ds = await getDataSource();
  const subRepo = ds.getRepository(Subscription);
  const subscription = await subRepo.findOne({ where: { id: subscriptionId } });
  if (!subscription) {
    throw new NotFoundError("Abonnement introuvable.");
  }
  await subRepo.update({ id: subscriptionId }, { revoked: false, revokedAt: null, revokedReason: null, revokedBy: null });
}

export type SubscriptionScanOutcome =
  | "SUCCESS"
  | "ALREADY_VALIDATED_TODAY"
  | "NOT_PAID"
  | "NOT_YET_VALID"
  | "EXPIRED"
  | "REVOKED"
  | "INVALID";

export interface SubscriptionScanResult {
  outcome: SubscriptionScanOutcome;
  reference?: string;
  categoryName?: string;
  /** Fournie sur ALREADY_VALIDATED_TODAY pour que le staff voie la dernière validation. */
  lastValidatedOn?: Date | null;
}

/**
 * Scanner de contrôle d'accès pour les abonnements — même principe que
 * scanTicket (lib/tickets.ts, le jeton n'identifie que l'abonnement, le
 * statut réel est toujours relu ici), mais règle différente : au lieu d'un
 * usage unique (`USED`), au plus UNE validation réussie par jour civil
 * (`lastValidatedOn`), reconduite à chaque nouveau jour tant que
 * `validFrom <= aujourd'hui <= validUntil`.
 */
export async function scanSubscription(token: string, scannedBy: string, terminalId?: string): Promise<SubscriptionScanResult> {
  const ds = await getDataSource();
  const scanLogRepo = ds.getRepository(SubscriptionScanLog);

  const subscriptionId = await verifySubscriptionToken(token);
  if (!subscriptionId) {
    await scanLogRepo.save(scanLogRepo.create({ subscriptionId: null, result: "INVALID", scannedBy, terminalId: terminalId ?? null }));
    return { outcome: "INVALID" };
  }

  const subRepo = ds.getRepository(Subscription);
  const subscription = await subRepo.findOne({ where: { id: subscriptionId } });
  if (!subscription) {
    await scanLogRepo.save(scanLogRepo.create({ subscriptionId, result: "INVALID", scannedBy, terminalId: terminalId ?? null }));
    return { outcome: "INVALID" };
  }

  const category = await ds.getRepository(SubscriptionCategory).findOne({ where: { id: subscription.subscriptionCategoryId } });
  const base = { reference: subscription.reference, categoryName: category?.name };

  async function log(result: SubscriptionScanOutcome) {
    await scanLogRepo.save(scanLogRepo.create({ subscriptionId, result, scannedBy, terminalId: terminalId ?? null }));
  }

  if (subscription.revoked) {
    await log("REVOKED");
    return { outcome: "REVOKED", ...base };
  }

  if (subscription.status !== "PAID") {
    await log("NOT_PAID");
    return { outcome: "NOT_PAID", ...base };
  }

  const todayKey = dayKey(new Date());
  if (dayKey(subscription.validFrom) > todayKey) {
    await log("NOT_YET_VALID");
    return { outcome: "NOT_YET_VALID", ...base };
  }
  if (dayKey(subscription.validUntil) < todayKey) {
    await log("EXPIRED");
    return { outcome: "EXPIRED", ...base };
  }
  if (subscription.lastValidatedOn && dayKey(subscription.lastValidatedOn) === todayKey) {
    await log("ALREADY_VALIDATED_TODAY");
    return { outcome: "ALREADY_VALIDATED_TODAY", ...base, lastValidatedOn: subscription.lastValidatedOn };
  }

  // UPDATE conditionnel atomique — même défense en profondeur que scanTicket
  // contre deux scans quasi simultanés du même abonnement (deux terminaux au
  // même portique, par exemple).
  const todayDate = new Date(`${todayKey}T00:00:00.000Z`);
  const updateResult = await subRepo
    .createQueryBuilder()
    .update(Subscription)
    .set({ lastValidatedOn: todayDate })
    .where("id = :id AND status = 'PAID' AND revoked = 0 AND (last_validated_on IS NULL OR last_validated_on <> :today)", {
      id: subscriptionId,
      today: todayKey,
    })
    .execute();

  if (updateResult.affected !== 1) {
    const reloaded = await subRepo.findOne({ where: { id: subscriptionId } });
    await log("ALREADY_VALIDATED_TODAY");
    return { outcome: "ALREADY_VALIDATED_TODAY", ...base, lastValidatedOn: reloaded?.lastValidatedOn ?? null };
  }

  await log("SUCCESS");
  return { outcome: "SUCCESS", ...base };
}

export interface RecentSubscriptionScan {
  id: string;
  result: SubscriptionScanOutcome;
  scannedBy: string;
  scannedAt: Date;
  reference: string | null;
}

export async function listRecentSubscriptionScans(limit = 20): Promise<RecentSubscriptionScan[]> {
  const ds = await getDataSource();
  const logs = await ds.getRepository(SubscriptionScanLog).find({ order: { scannedAt: "DESC" }, take: limit });
  if (logs.length === 0) return [];

  const subscriptionIds = Array.from(new Set(logs.map((l) => l.subscriptionId).filter((id): id is string => !!id)));
  const subscriptions = subscriptionIds.length > 0 ? await ds.getRepository(Subscription).find({ where: { id: In(subscriptionIds) } }) : [];
  const referenceById = new Map(subscriptions.map((s) => [s.id, s.reference]));

  return logs.map((l) => ({
    id: l.id,
    result: l.result,
    scannedBy: l.scannedBy,
    scannedAt: l.scannedAt,
    reference: l.subscriptionId ? (referenceById.get(l.subscriptionId) ?? null) : null,
  }));
}
