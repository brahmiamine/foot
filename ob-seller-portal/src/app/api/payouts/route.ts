import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/database";
import { Payout } from "@/entities/Payout";
import { requireActiveSeller } from "@/lib/authz";
import { handleApiError } from "@/lib/api";

// Lecture seule : le déclenchement réel des paiements est réservé au futur
// Payment API. Le Seller Portal n'intègre aucun credential de provider de
// paiement et n'expose que l'historique.
export async function GET() {
  try {
    const { session } = await requireActiveSeller();
    const ds = await getDataSource();
    const items = await ds
      .getRepository(Payout)
      .find({ where: { sellerId: session.sellerId }, order: { createdAt: "DESC" } });

    return NextResponse.json({ items });
  } catch (error) {
    return handleApiError(error);
  }
}
