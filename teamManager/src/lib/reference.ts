import { randomUUID } from "crypto";

// Référence courte affichée au supporter (commande, e-mail, suivi) — dérivée
// d'un UUID pour rester unique sans dépendre d'un compteur partagé. Sert
// aussi d'orderId auprès de payment-api (voir src/services/OrderService.ts).
export function generateOrderReference(): string {
  return `CMD-${randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}
