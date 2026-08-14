import { NextRequest, NextResponse } from "next/server";
import { getDataSource } from "@/lib/database";
import { Product } from "@/entities/Product";
import { requireActiveSeller, assertOwnedBySeller, NotFoundError } from "@/lib/authz";
import { handleApiError } from "@/lib/api";
import { submitMarketplaceProduct } from "@/lib/marketplaceApiClient";

// Demande de validation à l'administration du club. Le vendeur ne peut jamais passer
// directement en APPROVED/PUBLISHED — seule club-hub (modération) le
// peut. La transition elle-même (règles + validation du prix) est
// appliquée par marketplace (ProductsService.sellerTransition, TS-04) ;
// seller-portal ne fait plus la vérification lui-même.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireActiveSeller();
    const { id } = await params;
    const ds = await getDataSource();
    const repo = ds.getRepository(Product);
    const existing = await repo.findOne({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundError("Produit introuvable.");
    }
    assertOwnedBySeller(existing.sellerId, session.sellerId);

    await submitMarketplaceProduct(session.sellerId, id);

    const product = await repo.findOne({ where: { id } });
    return NextResponse.json({ product });
  } catch (error) {
    return handleApiError(error);
  }
}
