import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDataSource } from "@/lib/database";
import { InventoryItem } from "@/entities/InventoryItem";
import { requireActiveSeller, assertOwnedBySeller, NotFoundError } from "@/lib/authz";
import { handleApiError } from "@/lib/api";

// Le vendeur ne peut modifier que `available` — `reserved` et `sold` sont
// dérivés du traitement des commandes côté serveur, jamais éditables ici.
const updateSchema = z.object({ available: z.number().int().min(0) });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireActiveSeller();
    const { id } = await params;
    const body = updateSchema.parse(await req.json());

    const ds = await getDataSource();
    const repo = ds.getRepository(InventoryItem);
    const item = await repo.findOne({ where: { id } });
    if (!item) throw new NotFoundError("Ligne de stock introuvable.");
    assertOwnedBySeller(item.sellerId, session.sellerId);

    item.available = body.available;
    await repo.save(item);

    return NextResponse.json({ item });
  } catch (error) {
    return handleApiError(error);
  }
}
