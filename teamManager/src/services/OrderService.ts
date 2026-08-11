import { EntityManager, In, IsNull, LessThan, Not } from "typeorm";
import { getDataSource } from "@/lib/database";
import { Product } from "@/entities/Product";
import { ShopOrder } from "@/entities/ShopOrder";
import { generateOrderReference } from "@/lib/reference";
import { getPaymentStatus, initPayment } from "@/lib/paymentApiClient";

/**
 * Checkout/paiement de la boutique club — même architecture que
 * `billetterie/src/lib/tickets.ts` (purchaseTickets/reconcileTicketPayment),
 * premier et jusqu'ici seul vrai appelant de payment-api du dépôt : réserve
 * en PENDING dans une transaction avec verrou pessimiste (anti-survente),
 * appelle payment-api HORS transaction (jamais d'appel réseau pendant qu'un
 * verrou DB est tenu), et compense (libère la réservation) si l'appel
 * échoue. La confirmation (PENDING -> PAID) n'arrive jamais ici : voir
 * reconcileOrderPayment, appelée depuis /paiement/retour et
 * opportunément depuis listMyOrders — payment-api ne rappelle jamais
 * teamManager, seuls les providers rappellent payment-api.
 */

// Une réservation PENDING sans paiement confirmé passé ce délai est
// considérée abandonnée et son stock libéré — sans ça, un panier jamais payé
// bloquerait du stock indéfiniment (pas de tâche planifiée dans ce dépôt
// pour un nettoyage périodique, voir avancement.md § C).
const PENDING_RESERVATION_TTL_MS = 30 * 60 * 1000;

async function releaseOrder(manager: EntityManager, orderId: string): Promise<void> {
  const order = await manager.findOne(ShopOrder, { where: { id: orderId } });
  if (!order || order.status !== "PENDING") return;

  order.status = "CANCELLED";
  await manager.save(order);

  const product = await manager.findOne(Product, { where: { id: order.productId }, lock: { mode: "pessimistic_write" } });
  if (product) {
    product.stock += order.quantity;
    await manager.save(product);
  }
}

export interface PurchaseInput {
  buyerId: string;
  buyerEmail?: string;
  productId: number;
  quantity: number;
}

export interface PurchaseResult {
  order: ShopOrder;
  /** Le caller doit rediriger le navigateur du supporter vers cette URL. */
  payUrl: string;
}

/**
 * Réserve la commande (PENDING) et décrémente le stock du produit dans une
 * transaction verrouillée, puis, hors transaction, initie le paiement
 * auprès de payment-api. Si l'initiation échoue, la réservation est libérée
 * (compensation) plutôt que de laisser une commande PENDING orpheline
 * qu'aucun paiement ne pourra jamais confirmer.
 */
export async function purchaseProduct(input: PurchaseInput): Promise<PurchaseResult> {
  if (input.quantity < 1) {
    throw new Error("La quantité doit être d'au moins 1 article.");
  }

  const ds = await getDataSource();

  const order = await ds.transaction(async (manager) => {
    const product = await manager.findOne(Product, {
      where: { id: input.productId },
      lock: { mode: "pessimistic_write" },
    });
    if (!product || !product.isActive) throw new Error("Produit introuvable.");

    // Libère les réservations abandonnées de ce produit avant de vérifier le
    // stock disponible.
    const staleCutoff = new Date(Date.now() - PENDING_RESERVATION_TTL_MS);
    const staleOrders = await manager.find(ShopOrder, {
      where: { productId: product.id, status: "PENDING", createdAt: LessThan(staleCutoff) },
    });
    if (staleOrders.length > 0) {
      for (const stale of staleOrders) {
        stale.status = "CANCELLED";
        product.stock += stale.quantity;
      }
      await manager.save(staleOrders);
    }

    if (input.quantity > product.stock) {
      throw new Error(`Il ne reste que ${Math.max(0, product.stock)} article(s) disponible(s) pour ce produit.`);
    }

    product.stock -= input.quantity;
    await manager.save(product);

    const unitPrice = product.price;
    const totalAmount = (Math.round(parseFloat(unitPrice) * input.quantity * 1000) / 1000).toFixed(3);

    const newOrder = manager.create(ShopOrder, {
      teamId: product.teamId,
      productId: product.id,
      buyerId: input.buyerId,
      quantity: input.quantity,
      unitPrice,
      totalAmount,
      status: "PENDING",
      reference: generateOrderReference(),
      paymentId: null,
    });
    return manager.save(newOrder);
  });

  let paymentId: string;
  let payUrl: string;
  try {
    const result = await initPayment({
      orderId: order.reference,
      amount: parseFloat(order.totalAmount),
      email: input.buyerEmail,
      userId: input.buyerId,
    });
    paymentId = result.paymentId;
    payUrl = result.payUrl;
  } catch (error) {
    await ds.transaction((manager) => releaseOrder(manager, order.id));
    throw error;
  }

  await ds.getRepository(ShopOrder).update(order.id, { paymentId });
  order.paymentId = paymentId;

  return { order, payUrl };
}

export type ReconcileResult = "PAID" | "PENDING" | "CANCELLED";

/**
 * payment-api ne rappelle jamais teamManager : c'est à teamManager de relire
 * GET /payments/:id quand c'est pertinent (retour du payeur depuis le
 * provider, ou consultation de "mes commandes"). Idempotent : ne modifie
 * qu'une commande encore PENDING pour ce paiement, sûr à appeler plusieurs
 * fois ou en concurrence.
 */
export async function reconcileOrderPayment(paymentId: string): Promise<ReconcileResult> {
  const ds = await getDataSource();
  const orderRepo = ds.getRepository(ShopOrder);

  const pendingOrder = await orderRepo.findOne({ where: { paymentId, status: "PENDING" } });
  if (!pendingOrder) {
    const any = await orderRepo.findOne({ where: { paymentId } });
    if (!any) return "CANCELLED";
    return any.status === "PAID" ? "PAID" : "CANCELLED";
  }

  const status = await getPaymentStatus(paymentId);

  if (status === "PAID") {
    await ds.transaction(async (manager) => {
      const order = await manager.findOne(ShopOrder, { where: { paymentId, status: "PENDING" } });
      if (!order) return;
      order.status = "PAID";
      order.paidAt = new Date();
      await manager.save(order);
    });
    return "PAID";
  }

  if (status === "FAILED" || status === "EXPIRED") {
    await ds.transaction(async (manager) => {
      const order = await manager.findOne(ShopOrder, { where: { paymentId, status: "PENDING" } });
      if (order) await releaseOrder(manager, order.id);
    });
    return "CANCELLED";
  }

  return "PENDING";
}

export interface MyOrder {
  id: string;
  reference: string;
  status: ShopOrder["status"];
  quantity: number;
  unitPrice: string;
  totalAmount: string;
  createdAt: Date;
  paidAt: Date | null;
  productId: number;
  productNameFr: string;
  productImageUrl: string | null;
}

export async function listMyOrders(buyerId: string): Promise<MyOrder[]> {
  const ds = await getDataSource();
  const orderRepo = ds.getRepository(ShopOrder);

  // Rattrapage opportuniste : si le supporter n'est jamais passé par la page
  // de retour de paiement (onglet fermé, navigation directe vers "mes
  // commandes"...), on relit le statut auprès de payment-api ici plutôt que
  // de laisser une commande payée afficher indéfiniment "En attente".
  const pendingWithPayment = await orderRepo.find({
    where: { buyerId, status: "PENDING", paymentId: Not(IsNull()) },
  });
  for (const order of pendingWithPayment) {
    if (order.paymentId) {
      await reconcileOrderPayment(order.paymentId).catch((error) => {
        console.error(`reconcileOrderPayment failed for payment ${order.paymentId}:`, error);
      });
    }
  }

  const orders = await orderRepo.find({ where: { buyerId }, order: { createdAt: "DESC" } });
  if (orders.length === 0) return [];

  const productIds = Array.from(new Set(orders.map((o) => o.productId)));
  const products = await ds.getRepository(Product).find({ where: { id: In(productIds) } });
  const productById = new Map(products.map((p) => [p.id, p]));

  return orders.map((o) => {
    const product = productById.get(o.productId);
    return {
      id: o.id,
      reference: o.reference,
      status: o.status,
      quantity: o.quantity,
      unitPrice: o.unitPrice,
      totalAmount: o.totalAmount,
      createdAt: o.createdAt,
      paidAt: o.paidAt,
      productId: o.productId,
      productNameFr: product?.nameFr ?? "Produit",
      productImageUrl: product?.imageUrl ?? null,
    };
  });
}
