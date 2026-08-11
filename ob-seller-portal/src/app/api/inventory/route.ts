import { NextRequest, NextResponse } from "next/server";
import { getDataSource } from "@/lib/database";
import { InventoryItem } from "@/entities/InventoryItem";
import { requireActiveSeller } from "@/lib/authz";
import { handleApiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const { session } = await requireActiveSeller();
    const url = new URL(req.url);
    const search = url.searchParams.get("q")?.trim();

    const ds = await getDataSource();
    const qb = ds
      .getRepository(InventoryItem)
      .createQueryBuilder("inventory")
      .leftJoinAndSelect("inventory.product", "product")
      .leftJoinAndSelect("inventory.variant", "variant")
      .where("inventory.sellerId = :sellerId", { sellerId: session.sellerId });

    if (search) {
      qb.andWhere("(product.name LIKE :search OR product.sku LIKE :search OR variant.sku LIKE :search)", {
        search: `%${search}%`,
      });
    }

    const items = await qb.orderBy("inventory.updatedAt", "DESC").getMany();
    return NextResponse.json({ items });
  } catch (error) {
    return handleApiError(error);
  }
}
