import { EntityManager, In, LessThan } from "typeorm";
import { getDataSource } from "@/lib/database";
import { Product } from "@/entities/Product";
import { Team } from "@/entities/Team";
import { ShopOrder } from "@/entities/ShopOrder";
import { ShopOrderItem } from "@/entities/ShopOrderItem";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { getPaymentProvider, getPaymentStatus, initPayment } from "@/lib/paymentApiClient";
import { fetchMemberProfile } from "@/lib/ssoProfileClient";

export interface ProductSummary {
  id: number;
  nameFr: string;
  descriptionFr: string | null;
  price: string;
  stock: number;
  imageUrl: string | null;
  categoryName: string | null;
}

/**
 * Catalogue public d'un club (produits actifs uniquement) — même lecture
 * que ob/src/services/PublicShopService.ts, mais exposée ici pour la
 * boutique générique multi-clubs (/boutique/[teamId], voir createOrder
 * pour pourquoi un panier ne mélange jamais deux clubs).
 */
export async function listActiveProductsForTeam(teamId: string): Promise<ProductSummary[]> {
  const ds = await getDataSource();
  const products = await ds.getRepository(Product).find({
    where: { teamId, isActive: true },
    relations: ["category"],
    order: { createdAt: "DESC" },
  });
  return products.map((p) => ({
    id: p.id,
    nameFr: p.nameFr,
    descriptionFr: p.descriptionFr ?? null,
    price: p.price,
    stock: p.stock,
    imageUrl: p.imageUrl ?? null,
    categoryName: p.category?.nameFr ?? null,
  }));
}

export interface TeamWithShop {
  id: string;
  nom: string;
}

/** Clubs ayant au moins un produit actif en stock — annuaire de /boutique. */
export async function listTeamsWithActiveProducts(): Promise<TeamWithShop[]> {
  const ds = await getDataSource();
  const rows = await ds
    .getRepository(Product)
    .createQueryBuilder("product")
    .innerJoin(Team, "team", "team.id = product.teamId")
    .select("DISTINCT team.id", "id")
    .addSelect("team.nom", "nom")
    .where("product.isActive = :active", { active: true })
    .andWhere("product.stock > 0")
    .orderBy("team.nom", "ASC")
    .getRawMany<{ id: string; nom: string }>();
  return rows;
}

export interface CartItemInput {
  productId: number;
  quantity: number;
}

export interface CreateOrderInput {
  purchaserId: string;
  purchaserEmail?: string;
  teamId: string;
  items: CartItemInput[];
}

export interface CreateOrderResult {
  order: ShopOrder;
  payUrl: string;
}

// Une commande PENDING sans paiement confirmé passé ce délai est considérée
// abandonnée et son stock libéré (voir releaseOrder et purgeStaleOrders) —
// même TTL que billetterie/src/lib/tickets.ts (PENDING_RESERVATION_TTL_MS).
const PENDING_ORDER_TTL_MS = 30 * 60 * 1000;

async function releaseOrder(manager: EntityManager, order: ShopOrder): Promise<void> {
  const items = await manager.find(ShopOrderItem, { where: { orderId: order.id } });
  order.status = "CANCELLED";
  await manager.save(order);

  // Trié par productId pour verrouiller dans un ordre stable, comme à la
  // création — évite un deadlock si deux libérations concurrentes touchent
  // les mêmes produits.
  const sortedItems = [...items].sort((a, b) => a.productId - b.productId);
  for (const item of sortedItems) {
    const product = await manager.findOne(Product, { where: { id: item.productId }, lock: { mode: "pessimistic_write" } });
    if (product) {
      product.stock += item.quantity;
      await manager.save(product);
    }
  }
}

export interface PurgeStaleOrdersResult {
  releasedOrders: number;
}

/**
 * Libère toutes les commandes PENDING abandonnées depuis plus de
 * PENDING_ORDER_TTL_MS — même rôle que
 * billetterie/src/lib/tickets.ts#purgeStalePendingTickets, appelée par le
 * scheduler in-process (instrumentation.ts).
 */
export async function purgeStaleOrders(): Promise<PurgeStaleOrdersResult> {
  const ds = await getDataSource();
  const staleCutoff = new Date(Date.now() - PENDING_ORDER_TTL_MS);

  return ds.transaction(async (manager) => {
    const staleOrders = await manager.find(ShopOrder, {
      where: { status: "PENDING", createdAt: LessThan(staleCutoff) },
    });
    for (const order of staleOrders) {
      await releaseOrder(manager, order);
    }
    return { releasedOrders: staleOrders.length };
  });
}

/**
 * Réserve le stock (verrouillage pessimiste par produit, panier limité à un
 * seul club — voir /boutique/[teamId]) puis, hors transaction, initie le
 * paiement auprès de payment-api. Si l'initiation échoue, la réservation
 * est libérée (compensation) plutôt que de laisser une commande PENDING
 * orpheline qu'aucun paiement ne pourra jamais confirmer — même stratégie
 * que billetterie/src/lib/tickets.ts#purchaseTickets.
 */
export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  if (input.items.length === 0) {
    throw new ForbiddenError("Le panier est vide.");
  }
  for (const item of input.items) {
    if (item.quantity < 1) {
      throw new ForbiddenError("La quantité doit être d'au moins 1 pour chaque article.");
    }
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

  // Dédoublonne et trie par productId : verrouillage dans un ordre stable
  // pour éviter les deadlocks entre deux commandes concurrentes.
  const quantityByProductId = new Map<number, number>();
  for (const item of input.items) {
    quantityByProductId.set(item.productId, (quantityByProductId.get(item.productId) ?? 0) + item.quantity);
  }
  const productIds = Array.from(quantityByProductId.keys()).sort((a, b) => a - b);

  const order = await ds.transaction(async (manager) => {
    const order = manager.create(ShopOrder, {
      teamId: input.teamId,
      purchaserId: input.purchaserId,
      status: "PENDING",
      totalPrice: "0.000",
      paymentId: null,
    });
    await manager.save(order);

    let total = 0;
    const orderItems: ShopOrderItem[] = [];
    for (const productId of productIds) {
      const quantity = quantityByProductId.get(productId)!;
      const product = await manager.findOne(Product, {
        where: { id: productId },
        lock: { mode: "pessimistic_write" },
      });
      if (!product || !product.isActive) {
        throw new NotFoundError("Un des produits du panier n'est plus disponible.");
      }
      if (product.teamId !== input.teamId) {
        // Ne devrait jamais arriver depuis l'UI (panier scopé par club),
        // mais un appel direct à l'action ne doit pas pouvoir mélanger deux
        // clubs dans une même commande.
        throw new ForbiddenError("Un panier ne peut contenir que des articles d'un seul club.");
      }
      if (product.stock < quantity) {
        throw new ConflictError(`Stock insuffisant pour "${product.nameFr}" (${product.stock} disponible(s)).`);
      }

      product.stock -= quantity;
      await manager.save(product);

      const unitPrice = product.price;
      const lineTotal = (parseFloat(unitPrice) * quantity).toFixed(3);
      total += parseFloat(lineTotal);

      orderItems.push(
        manager.create(ShopOrderItem, {
          orderId: order.id,
          productId: product.id,
          productNameFr: product.nameFr,
          unitPrice,
          quantity,
          lineTotal,
        }),
      );
    }

    await manager.save(orderItems);
    order.totalPrice = total.toFixed(3);
    await manager.save(order);
    return order;
  });

  let paymentId: string;
  let payUrl: string;
  try {
    const result = await initPayment({
      orderId: order.id,
      amount: parseFloat(order.totalPrice),
      email: input.purchaserEmail,
      userId: input.purchaserId,
      ...paymeeProfile,
    });
    paymentId = result.paymentId;
    payUrl = result.payUrl;
  } catch (error) {
    await ds.transaction((manager) => releaseOrder(manager, order));
    throw error;
  }

  order.paymentId = paymentId;
  await ds.getRepository(ShopOrder).update({ id: order.id }, { paymentId });

  return { order, payUrl };
}

export type ReconcileResult = "PAID" | "PENDING" | "CANCELLED" | "PAID_STOCK_UNAVAILABLE";

/**
 * payment-api ne rappelle jamais teamManager directement pour cette route :
 * c'est à teamManager de relire GET /payments/:id (retour du payeur, ou
 * webhook applicatif signé, voir app/api/payments/webhook/route.ts).
 * Idempotent — sûr à appeler plusieurs fois ou en concurrence, même
 * stratégie que billetterie/src/lib/tickets.ts#reconcileTicketPayment.
 *
 * TASK-P0-016 : une commande déjà CANCELLED (stock libéré par
 * purgeStaleOrders après PENDING_ORDER_TTL_MS) peut en théorie correspondre
 * à un paiement que le fournisseur a malgré tout confirmé entre-temps
 * (webhook très en retard, panne réseau prolongée) — le client aurait alors
 * payé sans repartir avec sa commande, et sans que personne ne le sache. On
 * vérifie donc explicitement le statut réel du paiement dans ce cas précis
 * (jamais fait auparavant : le code retournait juste "CANCELLED" sans
 * revérifier). Pas de remboursement automatique : payment-api n'expose
 * encore aucune primitive de remboursement (voir TASK-P1-007) — on
 * journalise donc un signal fort pour réconciliation manuelle par les ops,
 * plutôt que de perdre silencieusement l'information.
 */
export async function reconcileOrderPayment(paymentId: string): Promise<ReconcileResult> {
  const ds = await getDataSource();
  const orderRepo = ds.getRepository(ShopOrder);

  const order = await orderRepo.findOne({ where: { paymentId } });
  if (!order) return "CANCELLED";
  if (order.status !== "PENDING") {
    if (order.status === "PAID") return "PAID";

    const lateStatus = await getPaymentStatus(paymentId);
    if (lateStatus === "PAID") {
      console.error(
        JSON.stringify({
          event: "order_paid_after_stock_release",
          orderId: order.id,
          paymentId,
          teamId: order.teamId,
          timestamp: new Date().toISOString(),
        }),
      );
      return "PAID_STOCK_UNAVAILABLE";
    }
    return "CANCELLED";
  }

  const status = await getPaymentStatus(paymentId);

  if (status === "PAID") {
    await orderRepo.update({ id: order.id }, { status: "PAID", paidAt: new Date() });
    return "PAID";
  }

  if (status === "FAILED" || status === "EXPIRED") {
    await ds.transaction((manager) => releaseOrder(manager, order));
    return "CANCELLED";
  }

  return "PENDING";
}

export interface MyOrderItem {
  productNameFr: string;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
}

export interface MyOrder {
  id: string;
  status: ShopOrder["status"];
  totalPrice: string;
  createdAt: Date;
  paidAt: Date | null;
  teamName: string;
  items: MyOrderItem[];
}

export async function listMyOrders(purchaserId: string): Promise<MyOrder[]> {
  const ds = await getDataSource();
  const orderRepo = ds.getRepository(ShopOrder);

  // Rattrapage opportuniste, même logique que
  // billetterie/src/lib/tickets.ts#listMyTickets : si le client n'est
  // jamais passé par la page de retour, on relit le statut ici.
  const pendingWithPayment = await orderRepo.find({ where: { purchaserId, status: "PENDING" } });
  for (const order of pendingWithPayment) {
    if (order.paymentId) {
      await reconcileOrderPayment(order.paymentId).catch((error) => {
        console.error(`reconcileOrderPayment failed for payment ${order.paymentId}:`, error);
      });
    }
  }

  const orders = await orderRepo.find({ where: { purchaserId }, order: { createdAt: "DESC" } });
  if (orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);
  const items = await ds.getRepository(ShopOrderItem).find({ where: { orderId: In(orderIds) } });
  const itemsByOrderId = new Map<string, MyOrderItem[]>();
  for (const item of items) {
    const list = itemsByOrderId.get(item.orderId) ?? [];
    list.push({ productNameFr: item.productNameFr, unitPrice: item.unitPrice, quantity: item.quantity, lineTotal: item.lineTotal });
    itemsByOrderId.set(item.orderId, list);
  }

  const teamIds = Array.from(new Set(orders.map((o) => o.teamId)));
  const teams = await ds.getRepository(Team).find({ where: { id: In(teamIds) } });
  const teamById = new Map(teams.map((t) => [t.id, t]));

  return orders.map((o) => ({
    id: o.id,
    status: o.status,
    totalPrice: o.totalPrice,
    createdAt: o.createdAt,
    paidAt: o.paidAt,
    teamName: teamById.get(o.teamId)?.nom ?? "Club",
    items: itemsByOrderId.get(o.id) ?? [],
  }));
}

export interface TeamOrderSummary {
  id: string;
  status: ShopOrder["status"];
  totalPrice: string;
  createdAt: Date;
  itemCount: number;
}

/** Vue admin (staff du club) — lecture seule, pas de gestion de livraison/expédition (hors périmètre v1, voir avancement.md). */
export async function listOrdersForTeam(teamId: string): Promise<TeamOrderSummary[]> {
  const ds = await getDataSource();
  const orders = await ds.getRepository(ShopOrder).find({ where: { teamId }, order: { createdAt: "DESC" } });
  if (orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);
  const items = await ds.getRepository(ShopOrderItem).find({ where: { orderId: In(orderIds) } });
  const countByOrderId = new Map<string, number>();
  for (const item of items) {
    countByOrderId.set(item.orderId, (countByOrderId.get(item.orderId) ?? 0) + item.quantity);
  }

  return orders.map((o) => ({
    id: o.id,
    status: o.status,
    totalPrice: o.totalPrice,
    createdAt: o.createdAt,
    itemCount: countByOrderId.get(o.id) ?? 0,
  }));
}
