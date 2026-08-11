import { NextRequest, NextResponse } from "next/server";
import { getDataSource } from "@/lib/database";
import { Product } from "@/entities/Product";
import { ProductStatus, SELLER_ALLOWED_PRODUCT_TRANSITIONS } from "@/entities/enums";
import { requireActiveSeller, assertOwnedBySeller, NotFoundError } from "@/lib/authz";
import { handleApiError } from "@/lib/api";

// Demande de validation à l'OB. Le vendeur ne peut jamais passer
// directement en APPROVED/PUBLISHED — seule teamManager (modération) le
// peut ; voir SELLER_ALLOWED_PRODUCT_TRANSITIONS.
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

    const allowed = SELLER_ALLOWED_PRODUCT_TRANSITIONS[product.status] ?? [];
    if (!allowed.includes(ProductStatus.SUBMITTED)) {
      return NextResponse.json(
        { error: `Impossible de soumettre un produit au statut ${product.status}.` },
        { status: 409 },
      );
    }

    if (!product.price || Number(product.price) <= 0) {
      return NextResponse.json({ error: "Le prix doit être renseigné avant soumission." }, { status: 422 });
    }

    product.status = ProductStatus.SUBMITTED;
    product.rejectionReason = null;
    await repo.save(product);

    return NextResponse.json({ product });
  } catch (error) {
    return handleApiError(error);
  }
}
