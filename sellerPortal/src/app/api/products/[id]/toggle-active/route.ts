import { NextRequest, NextResponse } from "next/server";
import { getDataSource } from "@/lib/database";
import { Product } from "@/entities/Product";
import { requireActiveSeller, assertOwnedBySeller, NotFoundError } from "@/lib/authz";
import { handleApiError } from "@/lib/api";

// Activer/désactiver la visibilité d'un produit déjà publié n'est pas une
// modification de contenu : ça reste possible même hors des statuts
// éditables (DRAFT/REJECTED), sans redéclencher une modération.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireActiveSeller();
    const { id } = await params;
    const ds = await getDataSource();
    const repo = ds.getRepository(Product);
    const product = await repo.findOne({ where: { id } });
    if (!product || product.deletedAt) {
      throw new NotFoundError("Produit introuvable.");
    }
    assertOwnedBySeller(product.sellerId, session.sellerId);

    product.isActive = !product.isActive;
    await repo.save(product);

    return NextResponse.json({ product });
  } catch (error) {
    return handleApiError(error);
  }
}
