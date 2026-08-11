import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDataSource } from "@/lib/database";
import { Seller } from "@/entities/Seller";
import { requireSellerSession } from "@/lib/authz";
import { handleApiError } from "@/lib/api";

// Profil du vendeur connecté. Le sellerId vient uniquement de la session
// (requireSellerSession) — jamais d'un paramètre d'URL.
export async function GET() {
  try {
    const session = await requireSellerSession();
    const ds = await getDataSource();
    const seller = await ds.getRepository(Seller).findOne({ where: { id: session.sellerId } });
    if (!seller) {
      return NextResponse.json({ error: "Vendeur introuvable." }, { status: 404 });
    }
    return NextResponse.json({ seller });
  } catch (error) {
    return handleApiError(error);
  }
}

const updateSchema = z.object({
  businessName: z.string().min(2).max(191).optional(),
  logoUrl: z.string().max(500).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  phone: z.string().max(32).optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  country: z.string().max(120).optional().nullable(),
  taxId: z.string().max(120).optional().nullable(),
  tradeRegister: z.string().max(120).optional().nullable(),
});

// Champs volontairement absents du schéma : status, commissionRate,
// documents de validation — réservés à la modération OB (teamManager).
export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSellerSession();
    const body = updateSchema.parse(await req.json());

    const ds = await getDataSource();
    const repo = ds.getRepository(Seller);
    const seller = await repo.findOne({ where: { id: session.sellerId } });
    if (!seller) {
      return NextResponse.json({ error: "Vendeur introuvable." }, { status: 404 });
    }

    Object.assign(seller, body);
    await repo.save(seller);

    return NextResponse.json({ seller });
  } catch (error) {
    return handleApiError(error);
  }
}
