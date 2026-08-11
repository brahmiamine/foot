import { NextRequest, NextResponse } from "next/server";
import { getDataSource } from "@/lib/database";
import { SellerOrder } from "@/entities/SellerOrder";
import { SellerOrderStatus } from "@/entities/enums";
import { requireActiveSeller } from "@/lib/authz";
import { handleApiError } from "@/lib/api";

// Tous les montants sont calculés côté serveur à partir des commandes
// réellement enregistrées — jamais transmis ou recalculés côté client.
export async function GET(req: NextRequest) {
  try {
    const { session } = await requireActiveSeller();
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const ds = await getDataSource();
    const qb = ds
      .getRepository(SellerOrder)
      .createQueryBuilder("so")
      .where("so.sellerId = :sellerId", { sellerId: session.sellerId })
      .andWhere("so.status != :cancelled", { cancelled: SellerOrderStatus.CANCELLED });

    if (from) qb.andWhere("so.createdAt >= :from", { from });
    if (to) qb.andWhere("so.createdAt <= :to", { to });

    const orders = await qb.getMany();

    const grossSales = orders.reduce((sum, o) => sum + Number(o.subtotal), 0);
    const commission = orders.reduce((sum, o) => sum + Number(o.commissionAmount), 0);
    const refunds = orders
      .filter((o) => o.status === SellerOrderStatus.REFUNDED || o.status === SellerOrderStatus.RETURNED)
      .reduce((sum, o) => sum + Number(o.subtotal), 0);
    const net = orders
      .filter((o) => o.status !== SellerOrderStatus.REFUNDED && o.status !== SellerOrderStatus.RETURNED)
      .reduce((sum, o) => sum + Number(o.netAmount), 0);

    return NextResponse.json({
      grossSales,
      commission,
      refunds,
      net,
      ordersCount: orders.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
