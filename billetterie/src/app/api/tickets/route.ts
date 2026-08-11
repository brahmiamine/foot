import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSsoSession } from "@/lib/ssoSession";
import { purchaseTickets } from "@/lib/tickets";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { handleApiError } from "@/lib/api";

const purchaseSchema = z.object({
  matchTicketCategoryId: z.string().min(1),
  quantity: z.number().int().min(1).max(20),
  audienceConfirmed: z.boolean().optional().default(false),
});

// Achat mock (voir src/lib/tickets.ts) — le vendeur/organisateur n'est
// jamais lu depuis le body client, il est dérivé côté serveur du match
// résolu à partir de matchTicketCategoryId.
export async function POST(req: NextRequest) {
  try {
    const session = await getSsoSession();
    if (!session) {
      throw new UnauthorizedError("Connexion requise pour acheter un billet.");
    }
    if (session.role !== "MEMBER") {
      throw new ForbiddenError("Seul un compte membre peut acheter un billet.");
    }

    const body = purchaseSchema.parse(await req.json());
    const tickets = await purchaseTickets({
      purchaserId: session.id,
      matchTicketCategoryId: body.matchTicketCategoryId,
      quantity: body.quantity,
      audienceConfirmed: body.audienceConfirmed,
    });

    return NextResponse.json({ tickets }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
