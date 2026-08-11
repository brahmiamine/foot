import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/database";
import { Notification } from "@/entities/Notification";
import { requireActiveSeller } from "@/lib/authz";
import { handleApiError } from "@/lib/api";

export async function GET() {
  try {
    const { session } = await requireActiveSeller();
    const ds = await getDataSource();
    const repo = ds.getRepository(Notification);
    const [items, unreadCount] = await Promise.all([
      repo.find({ where: { sellerId: session.sellerId }, order: { createdAt: "DESC" }, take: 100 }),
      repo.count({ where: { sellerId: session.sellerId, isRead: false } }),
    ]);

    return NextResponse.json({ items, unreadCount });
  } catch (error) {
    return handleApiError(error);
  }
}
