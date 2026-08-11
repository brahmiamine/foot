import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDataSource } from "@/lib/database";
import { Product } from "@/entities/Product";
import { ProductImage } from "@/entities/ProductImage";
import { ProductStatus } from "@/entities/enums";
import { requireActiveSeller, assertOwnedBySeller, NotFoundError } from "@/lib/authz";
import { handleApiError } from "@/lib/api";

async function loadOwnedProduct(sellerId: string, productId: string) {
  const ds = await getDataSource();
  const product = await ds
    .getRepository(Product)
    .findOne({ where: { id: productId }, relations: ["variants", "images"] });
  if (!product || product.deletedAt) {
    throw new NotFoundError("Produit introuvable.");
  }
  // Toujours vérifier l'appartenance APRÈS chargement par id seul — jamais
  // WHERE id = ? AND sellerId = ? construit depuis une valeur cliente.
  assertOwnedBySeller(product.sellerId, sellerId);
  return product;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireActiveSeller();
    const { id } = await params;
    const product = await loadOwnedProduct(session.sellerId, id);
    return NextResponse.json({ product });
  } catch (error) {
    return handleApiError(error);
  }
}

const updateSchema = z.object({
  name: z.string().min(2).max(191).optional(),
  description: z.string().max(10000).optional().nullable(),
  shortDescription: z.string().max(500).optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  brand: z.string().max(191).optional().nullable(),
  price: z.number().positive().optional(),
  compareAtPrice: z.number().positive().optional().nullable(),
  taxRate: z.number().min(0).max(100).optional(),
  weightKg: z.number().positive().optional().nullable(),
  dimensions: z.string().max(120).optional().nullable(),
  isActive: z.boolean().optional(),
  images: z.array(z.string().max(500)).max(10).optional(),
});

// Un produit déjà en cours de modération (SUBMITTED/UNDER_REVIEW/PUBLISHED)
// ne peut plus être librement réécrit par le vendeur : seul un produit
// DRAFT ou REJECTED (retour à DRAFT) reste éditable sans repasser par l'administration du club.
const EDITABLE_STATUSES = new Set([ProductStatus.DRAFT, ProductStatus.REJECTED]);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireActiveSeller();
    const { id } = await params;
    const body = updateSchema.parse(await req.json());

    const ds = await getDataSource();
    const product = await loadOwnedProduct(session.sellerId, id);

    if (!EDITABLE_STATUSES.has(product.status)) {
      return NextResponse.json(
        { error: "Ce produit est en cours de modération et ne peut plus être modifié." },
        { status: 409 },
      );
    }

    const { images, ...rest } = body;
    Object.assign(product, {
      ...rest,
      price: rest.price !== undefined ? rest.price.toFixed(3) : product.price,
      compareAtPrice:
        rest.compareAtPrice !== undefined
          ? rest.compareAtPrice === null
            ? null
            : rest.compareAtPrice.toFixed(3)
          : product.compareAtPrice,
      taxRate: rest.taxRate !== undefined ? rest.taxRate.toFixed(2) : product.taxRate,
      weightKg:
        rest.weightKg !== undefined ? (rest.weightKg === null ? null : rest.weightKg.toFixed(3)) : product.weightKg,
    });

    await ds.transaction(async (manager) => {
      await manager.save(product);
      if (images) {
        await manager.delete(ProductImage, { productId: product.id });
        const newImages = images.map((url, position) => manager.create(ProductImage, { productId: product.id, url, position }));
        if (newImages.length) await manager.save(newImages);
      }
    });

    return NextResponse.json({ product });
  } catch (error) {
    return handleApiError(error);
  }
}

// Suppression logique uniquement — l'historique (commandes passées) doit
// rester intact même si le vendeur retire un produit du catalogue.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireActiveSeller();
    const { id } = await params;
    const ds = await getDataSource();
    const product = await loadOwnedProduct(session.sellerId, id);

    product.deletedAt = new Date();
    product.isActive = false;
    await ds.getRepository(Product).save(product);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
