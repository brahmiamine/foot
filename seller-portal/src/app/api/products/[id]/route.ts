import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDataSource } from "@/lib/database";
import { Product } from "@/entities/Product";
import { ProductImage } from "@/entities/ProductImage";
import { ProductCategory } from "@/entities/ProductCategory";
import { ProductStatus } from "@/entities/enums";
import { requireActiveSeller, assertOwnedBySeller, NotFoundError } from "@/lib/authz";
import { handleApiError } from "@/lib/api";
import { deleteMarketplaceProduct, updateMarketplaceProduct } from "@/lib/marketplaceApiClient";

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

// isActive n'est jamais modifié ici : la visibilité passe exclusivement par
// POST /api/products/[id]/toggle-active (bascule sans restriction de statut,
// sémantique différente d'une mise à jour de contenu — voir marketplace
// ProductsService.toggleActive).
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
  images: z.array(z.string().max(500)).max(10).optional(),
});

// Un produit déjà en cours de modération (SUBMITTED/UNDER_REVIEW/PUBLISHED)
// ne peut plus être librement réécrit par le vendeur : seul un produit
// DRAFT ou REJECTED (retour à DRAFT) reste éditable sans repasser par
// l'administration du club — même règle appliquée côté marketplace
// (ProductsService.update), vérifiée ici pour retourner une erreur avant
// l'appel réseau.
const EDITABLE_STATUSES = new Set([ProductStatus.DRAFT, ProductStatus.REJECTED]);

// Les champs du produit sont mis à jour via marketplace (voir
// src/lib/marketplaceApiClient.ts, TS-04) ; seules les images restent
// gérées en TypeORM direct côté seller-portal.
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

    // Comme à la création, ne jamais faire confiance à un categoryId client
    // sans vérifier qu'il appartient au club du vendeur connecté.
    if (body.categoryId) {
      const category = await ds
        .getRepository(ProductCategory)
        .findOne({ where: { id: body.categoryId, clubId: session.clubId } });
      if (!category) {
        return NextResponse.json({ error: "Catégorie introuvable." }, { status: 422 });
      }
    }

    const { images, ...rest } = body;
    await updateMarketplaceProduct(session.sellerId, id, rest);

    if (images) {
      await ds.transaction(async (manager) => {
        await manager.delete(ProductImage, { productId: product.id });
        const newImages = images.map((url, position) => manager.create(ProductImage, { productId: product.id, url, position }));
        if (newImages.length) await manager.save(newImages);
      });
    }

    const updated = await ds.getRepository(Product).findOne({ where: { id } });
    return NextResponse.json({ product: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

// Suppression logique uniquement (voir marketplace ProductsService.remove)
// — l'historique (commandes passées) doit rester intact même si le vendeur
// retire un produit du catalogue.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireActiveSeller();
    const { id } = await params;
    await loadOwnedProduct(session.sellerId, id);

    await deleteMarketplaceProduct(session.sellerId, id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
