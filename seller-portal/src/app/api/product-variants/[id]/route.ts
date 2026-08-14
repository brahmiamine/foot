import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDataSource } from "@/lib/database";
import { ProductVariant } from "@/entities/ProductVariant";
import { Product } from "@/entities/Product";
import { requireActiveSeller, assertOwnedBySeller, NotFoundError } from "@/lib/authz";
import { handleApiError } from "@/lib/api";

async function loadOwnedVariant(sellerId: string, variantId: string) {
  const ds = await getDataSource();
  const variant = await ds.getRepository(ProductVariant).findOne({ where: { id: variantId } });
  if (!variant) throw new NotFoundError("Variante introuvable.");
  const product = await ds.getRepository(Product).findOne({ where: { id: variant.productId } });
  if (!product) throw new NotFoundError("Variante introuvable.");
  assertOwnedBySeller(product.sellerId, sellerId);
  return variant;
}

const updateSchema = z.object({
  attributes: z.record(z.string(), z.string()).optional(),
  price: z.number().positive().optional().nullable(),
  imageUrl: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireActiveSeller();
    const { id } = await params;
    const body = updateSchema.parse(await req.json());

    const ds = await getDataSource();
    const variant = await loadOwnedVariant(session.sellerId, id);

    Object.assign(variant, {
      ...body,
      price: body.price !== undefined ? (body.price === null ? null : body.price.toFixed(3)) : variant.price,
    });
    await ds.getRepository(ProductVariant).save(variant);

    return NextResponse.json({ variant });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireActiveSeller();
    const { id } = await params;
    const ds = await getDataSource();
    const variant = await loadOwnedVariant(session.sellerId, id);
    await ds.getRepository(ProductVariant).remove(variant);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
