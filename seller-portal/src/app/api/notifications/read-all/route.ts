import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/database";
import { Notification } from "@/entities/Notification";
import { requireActiveSeller } from "@/lib/authz";
import { handleApiError } from "@/lib/api";

export async function POST() {
  try {
    const { session } = await requireActiveSeller();
    const ds = await getDataSource();
    await ds.getRepository(Notification).update({ sellerId: session.sellerId, isRead: false }, { isRead: true });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
