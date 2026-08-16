import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveSeller } from "@/lib/authz";
import { handleApiError } from "@/lib/api";
import { deleteMarketplaceVariant, updateMarketplaceVariant } from "@/lib/marketplaceApiClient";

const updateSchema = z.object({
  sku: z.string().min(1).max(120).optional(),
  attributes: z.record(z.string(), z.string()).optional(),
  price: z.number().positive().optional().nullable(),
  imageUrl: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireActiveSeller();
    const { id } = await params;
    const body = updateSchema.parse(await req.json());
    const variant = await updateMarketplaceVariant(session.sellerId, id, body);
    return NextResponse.json({ variant });
  } catch (error) { return handleApiError(error); }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireActiveSeller();
    const { id } = await params;
    await deleteMarketplaceVariant(session.sellerId, id);
    return NextResponse.json({ ok: true });
  } catch (error) { return handleApiError(error); }
}
