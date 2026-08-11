import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/database";
import { Product } from "@/entities/Product";
import { SellerOrder } from "@/entities/SellerOrder";
import { InventoryItem } from "@/entities/InventoryItem";
import { ProductStatus, SellerOrderStatus } from "@/entities/enums";
import { requireActiveSeller } from "@/lib/authz";
import { handleApiError } from "@/lib/api";

export async function GET() {
  try {
    const { session, seller } = await requireActiveSeller();
    const ds = await getDataSource();

    const productRepo = ds.getRepository(Product);
    const orderRepo = ds.getRepository(SellerOrder);
    const inventoryRepo = ds.getRepository(InventoryItem);

    const [activeProducts, pendingOrders, readyToShipOrders, lowStock, recentOrders, sellableOrders] =
      await Promise.all([
        productRepo.count({
          where: { sellerId: session.sellerId, status: ProductStatus.PUBLISHED, isActive: true },
        }),
        orderRepo.count({ where: { sellerId: session.sellerId, status: SellerOrderStatus.PENDING } }),
        orderRepo.count({ where: { sellerId: session.sellerId, status: SellerOrderStatus.READY_TO_SHIP } }),
        inventoryRepo
          .createQueryBuilder("i")
          .leftJoinAndSelect("i.product", "product")
          .where("i.sellerId = :sellerId", { sellerId: session.sellerId })
          .andWhere("i.available <= 0")
          .getMany(),
        orderRepo.find({
          where: { sellerId: session.sellerId },
          order: { createdAt: "DESC" },
          take: 5,
          relations: ["items"],
        }),
        orderRepo
          .createQueryBuilder("so")
          .where("so.sellerId = :sellerId", { sellerId: session.sellerId })
          .andWhere("so.status != :cancelled", { cancelled: SellerOrderStatus.CANCELLED })
          .getMany(),
      ]);

    const sales = sellableOrders.reduce((sum, o) => sum + Number(o.subtotal), 0);
    const commission = sellableOrders.reduce((sum, o) => sum + Number(o.commissionAmount), 0);
    const net = sellableOrders.reduce((sum, o) => sum + Number(o.netAmount), 0);

    return NextResponse.json({
      sellerName: seller.businessName,
      sellerStatus: seller.status,
      activeProducts,
      pendingOrders,
      readyToShipOrders,
      lowStockCount: lowStock.length,
      lowStockProducts: lowStock.slice(0, 5).map((i) => ({ id: i.id, productName: i.product?.name ?? "—" })),
      sales,
      commission,
      net,
      recentOrders,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
