import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/lib/notifications/push";

export const runtime = "nodejs";

export async function GET() {
  const key = getVapidPublicKey();
  if (!key) {
    return NextResponse.json({ error: "Notifications non configurées" }, { status: 503 });
  }
  return NextResponse.json({ publicKey: key });
}
