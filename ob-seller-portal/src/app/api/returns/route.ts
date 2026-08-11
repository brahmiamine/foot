import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/database";
import { ReturnRequest } from "@/entities/ReturnRequest";
import { requireActiveSeller } from "@/lib/authz";
import { handleApiError } from "@/lib/api";

// Lecture seule : les règles d'acceptation/remboursement d'un retour sont
// définies par la marketplace OB, pas par le vendeur (pas de POST ici).
export async function GET() {
  try {
    const { session } = await requireActiveSeller();
    const ds = await getDataSource();
    const items = await ds
      .getRepository(ReturnRequest)
      .createQueryBuilder("r")
      .leftJoinAndSelect("r.sellerOrder", "sellerOrder")
      .leftJoinAndSelect("r.sellerOrderItem", "item")
      .where("r.sellerId = :sellerId", { sellerId: session.sellerId })
      .orderBy("r.createdAt", "DESC")
      .getMany();

    return NextResponse.json({ items });
  } catch (error) {
    return handleApiError(error);
  }
}
