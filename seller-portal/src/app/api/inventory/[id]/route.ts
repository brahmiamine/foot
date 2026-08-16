import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveSeller } from "@/lib/authz";
import { handleApiError } from "@/lib/api";
import { updateMarketplaceInventory } from "@/lib/marketplaceApiClient";

const updateSchema = z.object({ available: z.number().int().min(0) });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireActiveSeller();
    const { id } = await params;
    const body = updateSchema.parse(await req.json());
    const item = await updateMarketplaceInventory(session.sellerId, id, body.available);
    return NextResponse.json({ item });
  } catch (error) { return handleApiError(error); }
}
