import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDataSource } from "@/lib/database";
import { Product } from "@/entities/Product";
import { ProductCategory } from "@/entities/ProductCategory";
import { ProductStatus } from "@/entities/enums";
import { requireActiveSeller, assertOwnedBySeller, NotFoundError } from "@/lib/authz";
import { handleApiError } from "@/lib/api";
import { deleteMarketplaceProduct, updateMarketplaceProduct } from "@/lib/marketplaceApiClient";

async function loadOwnedProduct(sellerId: string, productId: string) {
  const ds = await getDataSource();
  const product = await ds.getRepository(Product).findOne({ where: { id: productId }, relations: ["variants", "images"] });
  if (!product || product.deletedAt) throw new NotFoundError("Produit introuvable.");
  assertOwnedBySeller(product.sellerId, sellerId);
  return product;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireActiveSeller();
    const { id } = await params;
    return NextResponse.json({ product: await loadOwnedProduct(session.sellerId, id) });
  } catch (error) { return handleApiError(error); }
}

const updateSchema = z.object({
  name: z.string().min(2).max(191).optional(), description: z.string().max(10000).optional().nullable(),
  shortDescription: z.string().max(500).optional().nullable(), categoryId: z.string().uuid().optional().nullable(),
  brand: z.string().max(191).optional().nullable(), price: z.number().positive().optional(),
  compareAtPrice: z.number().positive().optional().nullable(), taxRate: z.number().min(0).max(100).optional(),
  weightKg: z.number().positive().optional().nullable(), dimensions: z.string().max(120).optional().nullable(),
  images: z.array(z.string().max(500)).max(10).optional(),
});
const EDITABLE_STATUSES = new Set([ProductStatus.DRAFT, ProductStatus.REJECTED]);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireActiveSeller();
    const { id } = await params;
    const body = updateSchema.parse(await req.json());
    const ds = await getDataSource();
    const product = await loadOwnedProduct(session.sellerId, id);
    if (!EDITABLE_STATUSES.has(product.status)) {
      return NextResponse.json({ error: "Ce produit est en cours de modération et ne peut plus être modifié." }, { status: 409 });
    }
    if (body.categoryId) {
      const category = await ds.getRepository(ProductCategory).findOne({ where: { id: body.categoryId, clubId: session.clubId } });
      if (!category) return NextResponse.json({ error: "Catégorie introuvable." }, { status: 422 });
    }
    const updated = await updateMarketplaceProduct(session.sellerId, id, body);
    return NextResponse.json({ product: updated });
  } catch (error) { return handleApiError(error); }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireActiveSeller();
    const { id } = await params;
    await loadOwnedProduct(session.sellerId, id);
    await deleteMarketplaceProduct(session.sellerId, id);
    return NextResponse.json({ ok: true });
  } catch (error) { return handleApiError(error); }
}
