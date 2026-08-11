import { NextRequest, NextResponse } from "next/server";
import { getDataSource } from "@/lib/database";
import { SellerOrder } from "@/entities/SellerOrder";
import { requireActiveSeller, assertOwnedBySeller, NotFoundError } from "@/lib/authz";
import { handleApiError } from "@/lib/api";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireActiveSeller();
    const { id } = await params;
    const ds = await getDataSource();
    const order = await ds
      .getRepository(SellerOrder)
      .findOne({ where: { id }, relations: ["items", "marketOrder"] });

    if (!order) throw new NotFoundError("Commande introuvable.");
    // Un vendeur qui devine l'id d'une commande d'un autre vendeur reçoit
    // exactement la même 404 que pour un id inexistant — aucune fuite.
    assertOwnedBySeller(order.sellerId, session.sellerId);

    return NextResponse.json({ order });
  } catch (error) {
    return handleApiError(error);
  }
}
