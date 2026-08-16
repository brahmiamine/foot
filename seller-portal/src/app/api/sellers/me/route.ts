import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSellerSession } from "@/lib/authz";
import { handleApiError } from "@/lib/api";
import { getMarketplaceSellerProfile, updateMarketplaceSellerProfile } from "@/lib/marketplaceApiClient";

export async function GET() {
  try {
    const session = await requireSellerSession();
    return NextResponse.json({ seller: await getMarketplaceSellerProfile(session.sellerId) });
  } catch (error) { return handleApiError(error); }
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

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSellerSession();
    const body = updateSchema.parse(await req.json());
    return NextResponse.json({ seller: await updateMarketplaceSellerProfile(session.sellerId, body) });
  } catch (error) { return handleApiError(error); }
}
