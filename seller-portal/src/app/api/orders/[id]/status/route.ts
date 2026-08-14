import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDataSource } from "@/lib/database";
import { SellerOrder } from "@/entities/SellerOrder";
import { SellerOrderStatus, SELLER_ORDER_FORWARD_TRANSITIONS } from "@/entities/enums";
import { requireActiveSeller, assertOwnedBySeller, NotFoundError } from "@/lib/authz";
import { handleApiError } from "@/lib/api";

const schema = z.object({
  status: z.enum(Object.values(SellerOrderStatus) as [SellerOrderStatus, ...SellerOrderStatus[]]),
});

// Fait avancer la commande d'un cran dans le cycle CONFIRMED -> PROCESSING
// -> READY_TO_SHIP. Le passage à SHIPPED exige carrier + tracking et passe
// par /orders/[id]/shipping ; DELIVERED/CANCELLED/RETURN_* ne sont jamais
// choisis librement par le vendeur (pilotés par le client/transporteur/l'administration du club).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireActiveSeller();
    const { id } = await params;
    const { status: nextStatus } = schema.parse(await req.json());

    const ds = await getDataSource();
    const repo = ds.getRepository(SellerOrder);
    const order = await repo.findOne({ where: { id } });
    if (!order) throw new NotFoundError("Commande introuvable.");
    assertOwnedBySeller(order.sellerId, session.sellerId);

    const allowed: SellerOrderStatus[] = (SELLER_ORDER_FORWARD_TRANSITIONS[order.status] ?? []).filter(
      (s) => s !== SellerOrderStatus.SHIPPED,
    );
    if (!allowed.includes(nextStatus)) {
      return NextResponse.json(
        { error: `Transition ${order.status} → ${nextStatus} non autorisée.` },
        { status: 409 },
      );
    }

    order.status = nextStatus;
    await repo.save(order);

    return NextResponse.json({ order });
  } catch (error) {
    return handleApiError(error);
  }
}
