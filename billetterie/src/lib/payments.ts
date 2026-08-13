import { getDataSource } from "@/lib/database";
import { Ticket } from "@/entities/Ticket";
import { Subscription } from "@/entities/Subscription";
import { reconcileTicketPayment, type ReconcileResult } from "@/lib/tickets";
import { reconcileSubscriptionPayment, type ReconcileSubscriptionResult } from "@/lib/subscriptions";

export type PaymentKind = "TICKET" | "SUBSCRIPTION" | "UNKNOWN";

export interface ReconcilePaymentResult {
  kind: PaymentKind;
  result: ReconcileResult | ReconcileSubscriptionResult;
}

/**
 * Un même `paymentId` payment-api couvre soit un panier de billets, soit un
 * panier d'abonnements, jamais les deux (purchaseTickets et
 * purchaseSubscription initient chacun leur propre paiement) — mais le
 * webhook (api/payments/webhook) et la page de retour payeur
 * (app/paiement/retour) ne savent pas lequel avant de recevoir le
 * paymentId. On regarde donc d'abord si une ligne `tk_tickets` porte ce
 * paymentId ; sinon on tente `tk_subscriptions`. Sans ce détour, un
 * paiement d'abonnement était silencieusement traité par
 * reconcileTicketPayment, qui ne trouve aucun billet et renvoie CANCELLED à
 * tort (voir lib/tickets.ts).
 */
export async function reconcilePayment(paymentId: string): Promise<ReconcilePaymentResult> {
  const ds = await getDataSource();

  const hasTicket = await ds.getRepository(Ticket).exists({ where: { paymentId } });
  if (hasTicket) {
    return { kind: "TICKET", result: await reconcileTicketPayment(paymentId) };
  }

  const hasSubscription = await ds.getRepository(Subscription).exists({ where: { paymentId } });
  if (hasSubscription) {
    return { kind: "SUBSCRIPTION", result: await reconcileSubscriptionPayment(paymentId) };
  }

  return { kind: "UNKNOWN", result: "CANCELLED" };
}
