import { NextRequest, NextResponse } from "next/server";
import { getDataSource } from "@/lib/database";
import { Notification } from "@/entities/Notification";
import { requireActiveSeller, assertOwnedBySeller, NotFoundError } from "@/lib/authz";
import { handleApiError } from "@/lib/api";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireActiveSeller();
    const { id } = await params;
    const ds = await getDataSource();
    const repo = ds.getRepository(Notification);
    const notification = await repo.findOne({ where: { id } });
    if (!notification) throw new NotFoundError("Notification introuvable.");
    assertOwnedBySeller(notification.sellerId, session.sellerId);

    notification.isRead = true;
    await repo.save(notification);

    return NextResponse.json({ notification });
  } catch (error) {
    return handleApiError(error);
  }
}
