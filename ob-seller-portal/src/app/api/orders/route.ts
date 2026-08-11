import { NextRequest, NextResponse } from "next/server";
import { getDataSource } from "@/lib/database";
import { SellerOrder } from "@/entities/SellerOrder";
import { SellerOrderStatus } from "@/entities/enums";
import { requireActiveSeller } from "@/lib/authz";
import { handleApiError } from "@/lib/api";

// Le vendeur ne voit que ses propres sous-commandes (SellerOrder), jamais
// la commande globale multi-vendeurs (MarketOrder) dans son intégralité.
export async function GET(req: NextRequest) {
  try {
    const { session } = await requireActiveSeller();
    const url = new URL(req.url);
    const status = url.searchParams.get("status") as SellerOrderStatus | null;
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "20", 10)));

    const ds = await getDataSource();
    const qb = ds
      .getRepository(SellerOrder)
      .createQueryBuilder("so")
      .leftJoinAndSelect("so.marketOrder", "order")
      .leftJoinAndSelect("so.items", "items")
      .where("so.sellerId = :sellerId", { sellerId: session.sellerId });

    if (status && Object.values(SellerOrderStatus).includes(status)) {
      qb.andWhere("so.status = :status", { status });
    }

    const [items, total] = await qb
      .orderBy("so.createdAt", "DESC")
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return NextResponse.json({ items, total, page, pageSize });
  } catch (error) {
    return handleApiError(error);
  }
}
