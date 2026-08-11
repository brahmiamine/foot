import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDataSource } from "@/lib/database";
import { SellerOrder } from "@/entities/SellerOrder";
import { SellerOrderStatus } from "@/entities/enums";
import { requireActiveSeller, assertOwnedBySeller, NotFoundError } from "@/lib/authz";
import { handleApiError } from "@/lib/api";

const schema = z.object({
  carrier: z.string().min(1).max(120),
  trackingNumber: z.string().min(1).max(191),
  shippedAt: z.string().datetime().optional(),
});

// Abstraction volontairement minimale (V1) : pas d'intégration transporteur
// externe, juste un enregistrement déclaratif. Prévu pour être branché plus
// tard sur une vraie API transporteur sans changer ce contrat.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireActiveSeller();
    const { id } = await params;
    const body = schema.parse(await req.json());

    const ds = await getDataSource();
    const repo = ds.getRepository(SellerOrder);
    const order = await repo.findOne({ where: { id } });
    if (!order) throw new NotFoundError("Commande introuvable.");
    assertOwnedBySeller(order.sellerId, session.sellerId);

    if (order.status !== SellerOrderStatus.READY_TO_SHIP) {
      return NextResponse.json(
        { error: "La commande doit être au statut 'à préparer terminé' (READY_TO_SHIP) avant expédition." },
        { status: 409 },
      );
    }

    order.shippingCarrier = body.carrier;
    order.trackingNumber = body.trackingNumber;
    order.shippedAt = body.shippedAt ? new Date(body.shippedAt) : new Date();
    order.status = SellerOrderStatus.SHIPPED;
    await repo.save(order);

    return NextResponse.json({ order });
  } catch (error) {
    return handleApiError(error);
  }
}
