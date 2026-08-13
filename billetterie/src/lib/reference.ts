import { randomUUID } from "crypto";

// Référence courte affichée au supporter (billet, e-mail, contrôle) —
// dérivée d'un UUID pour rester unique sans dépendre d'un compteur partagé.
export function generateTicketReference(): string {
  return `TK-${randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}

/** Même principe que generateTicketReference, préfixe distinct pour repérer un abonnement au premier coup d'œil. */
export function generateSubscriptionReference(): string {
  return `AB-${randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}
