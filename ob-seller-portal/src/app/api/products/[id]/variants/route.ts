import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDataSource } from "@/lib/database";
import { Product } from "@/entities/Product";
import { ProductVariant } from "@/entities/ProductVariant";
import { InventoryItem } from "@/entities/InventoryItem";
import { requireActiveSeller, assertOwnedBySeller, NotFoundError } from "@/lib/authz";
import { handleApiError } from "@/lib/api";

const createVariantSchema = z.object({
  sku: z.string().min(1).max(120),
  attributes: z.record(z.string(), z.string()).refine((a) => Object.keys(a).length > 0, "Au moins un attribut requis."),
  price: z.number().positive().optional(),
  imageUrl: z.string().max(500).optional(),
  initialStock: z.number().int().min(0).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireActiveSeller();
    const { id } = await params;
    const body = createVariantSchema.parse(await req.json());

    const ds = await getDataSource();
    const product = await ds.getRepository(Product).findOne({ where: { id } });
    if (!product || product.deletedAt) {
      throw new NotFoundError("Produit introuvable.");
    }
    assertOwnedBySeller(product.sellerId, session.sellerId);

    const existingSku = await ds.getRepository(ProductVariant).findOne({ where: { sku: body.sku } });
    if (existingSku) {
      return NextResponse.json({ error: "Ce SKU de variante est déjà utilisé." }, { status: 409 });
    }

    const variant = await ds.transaction(async (manager) => {
      const created = manager.create(ProductVariant, {
        productId: product.id,
        sku: body.sku,
        attributes: body.attributes,
        price: body.price ? body.price.toFixed(3) : null,
        imageUrl: body.imageUrl ?? null,
      });
      await manager.save(created);

      await manager.save(
        manager.create(InventoryItem, {
          sellerId: session.sellerId,
          productId: product.id,
          variantId: created.id,
          available: body.initialStock ?? 0,
        }),
      );

      return created;
    });

    return NextResponse.json({ variant }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
