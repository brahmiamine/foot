import { randomUUID } from "crypto";

// Référence courte affichée au supporter (billet, e-mail, contrôle) —
// dérivée d'un UUID pour rester unique sans dépendre d'un compteur partagé.
export function generateTicketReference(): string {
  return `TK-${randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}
