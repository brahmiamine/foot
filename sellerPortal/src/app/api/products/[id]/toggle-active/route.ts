import { NextRequest, NextResponse } from "next/server";
import { getDataSource } from "@/lib/database";
import { Product } from "@/entities/Product";
import { requireActiveSeller, assertOwnedBySeller, NotFoundError } from "@/lib/authz";
import { handleApiError } from "@/lib/api";
import { toggleActiveMarketplaceProduct } from "@/lib/marketplaceApiClient";

// Activer/désactiver la visibilité d'un produit déjà publié n'est pas une
// modification de contenu : ça reste possible même hors des statuts
// éditables (DRAFT/REJECTED), sans redéclencher une modération. La bascule
// elle-même est appliquée par marketplace-api (ProductsService.toggleActive,
// TS-04) — sellerPortal ne fait plus l'écriture lui-même.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireActiveSeller();
    const { id } = await params;
    const ds = await getDataSource();
    const existing = await ds.getRepository(Product).findOne({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundError("Produit introuvable.");
    }
    assertOwnedBySeller(existing.sellerId, session.sellerId);

    await toggleActiveMarketplaceProduct(session.sellerId, id);

    const product = await ds.getRepository(Product).findOne({ where: { id } });
    return NextResponse.json({ product });
  } catch (error) {
    return handleApiError(error);
  }
}
