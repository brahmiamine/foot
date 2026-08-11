import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/database";
import { ProductCategory } from "@/entities/ProductCategory";
import { requireSellerSession } from "@/lib/authz";
import { handleApiError } from "@/lib/api";

// Référentiel géré par l'OB — le vendeur choisit dans la liste, il n'en
// crée pas (voir teamManager pour la gestion des catégories).
export async function GET() {
  try {
    await requireSellerSession();
    const ds = await getDataSource();
    const items = await ds.getRepository(ProductCategory).find({ order: { name: "ASC" } });
    return NextResponse.json({ items });
  } catch (error) {
    return handleApiError(error);
  }
}
