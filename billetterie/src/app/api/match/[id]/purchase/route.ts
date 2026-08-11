import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSsoSession } from "@/lib/ssoSession";
import { purchaseTicket } from "@/lib/tickets";

const purchaseSchema = z.object({
  matchTicketCategoryId: z.string().min(1),
});

const ERROR_MESSAGES: Record<string, string> = {
  match_closed: "La billetterie de ce match n'est plus ouverte.",
  category_not_found: "Catégorie de billet introuvable.",
  sold_out: "Cette catégorie est complète.",
  not_yet_open: "La vente n'est pas encore ouverte pour cette catégorie.",
  sale_closed: "La vente est terminée pour cette catégorie.",
  not_eligible: "Cette catégorie est réservée à un autre public (voir les conditions de vente).",
  quota_reached: "Vous avez atteint le nombre maximum de billets pour cette catégorie.",
};

/**
 * Achat d'un billet. matchTicketCategoryId est le SEUL identifiant reçu du
 * client : prix, quota, fenêtre de vente et éligibilité d'audience sont
 * entièrement re-vérifiés côté serveur (voir src/lib/tickets.ts) — jamais
 * de confiance dans une valeur envoyée par le frontend.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSsoSession();
  if (!session || session.role !== "MEMBER") {
    return NextResponse.json({ error: "Connexion membre requise." }, { status: 401 });
  }

  // `id` (le match) sert uniquement à la navigation côté client — la seule
  // vérité serveur est matchTicketCategoryId, re-résolu à son match dans
  // purchaseTicket().
  await params;

  const body = await req.json().catch(() => null);
  const parsed = purchaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const result = await purchaseTicket(session.id, parsed.data.matchTicketCategoryId);
  if (!result.ok) {
    return NextResponse.json({ error: ERROR_MESSAGES[result.error] ?? "Achat impossible." }, { status: 409 });
  }

  return NextResponse.json({ ticket: { id: result.ticket.id, reference: result.ticket.reference } }, { status: 201 });
}
