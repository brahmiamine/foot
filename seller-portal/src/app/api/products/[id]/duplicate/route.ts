import { NextRequest, NextResponse } from "next/server";
import { getDataSource } from "@/lib/database";
import { Product } from "@/entities/Product";
import { requireActiveSeller, assertOwnedBySeller, NotFoundError } from "@/lib/authz";
import { handleApiError } from "@/lib/api";
import { slugify } from "@/lib/slug";
import { createMarketplaceProduct } from "@/lib/marketplaceApiClient";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireActiveSeller();
    const { id } = await params;
    const ds = await getDataSource();
    const source = await ds.getRepository(Product).findOne({ where: { id }, relations: ["images"] });
    if (!source || source.deletedAt) throw new NotFoundError("Produit introuvable.");
    assertOwnedBySeller(source.sellerId, session.sellerId);
    const created = await createMarketplaceProduct(session.sellerId, {
      name: `${source.name} (copie)`,
      slug: `${slugify(source.name)}-copy-${Date.now().toString(36)}`,
      description: source.description,
      shortDescription: source.shortDescription,
      categoryId: source.categoryId,
      brand: source.brand,
      sku: `${source.sku}-COPY-${Date.now().toString(36).toUpperCase()}`,
      price: Number(source.price),
      compareAtPrice: source.compareAtPrice ? Number(source.compareAtPrice) : null,
      taxRate: Number(source.taxRate),
      weightKg: source.weightKg ? Number(source.weightKg) : null,
      dimensions: source.dimensions,
      images: source.images?.map((image) => image.url),
    });
    return NextResponse.json({ product: created }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
