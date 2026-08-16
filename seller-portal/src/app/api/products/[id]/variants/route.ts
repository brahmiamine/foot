import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveSeller } from "@/lib/authz";
import { handleApiError } from "@/lib/api";
import { createMarketplaceVariant } from "@/lib/marketplaceApiClient";

const createVariantSchema = z.object({
  sku: z.string().min(1).max(120),
  attributes: z.record(z.string(), z.string()).refine((value) => Object.keys(value).length > 0, "Au moins un attribut requis."),
  price: z.number().positive().optional(),
  imageUrl: z.string().max(500).optional(),
  initialStock: z.number().int().min(0).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireActiveSeller();
    const { id } = await params;
    const body = createVariantSchema.parse(await req.json());
    const variant = await createMarketplaceVariant(session.sellerId, id, body);
    return NextResponse.json({ variant }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
