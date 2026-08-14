import { NextRequest, NextResponse } from "next/server";
import { ensureAdminAuth } from "@/lib/adminAuth";
import { fetchPushSubscriptions, registerPushSubscription } from "@/lib/notificationApi";

export const runtime = "nodejs";

/**
 * Proxy fin vers notifications (voir lib/notificationApi.ts) : referee-center
 * n'utilise pas de Server Actions ailleurs dans le dépôt, ces routes
 * exposent l'abonnement Web Push au même fetch() direct que le reste de
 * l'admin (voir AdminAlertsBadge.tsx pour le même pattern).
 */
export async function GET(request: NextRequest) {
  const unauthorized = await ensureAdminAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const subscriptions = await fetchPushSubscriptions();
    return NextResponse.json(subscriptions);
  } catch (error) {
    console.error("fetchPushSubscriptions failed:", error);
    return NextResponse.json({ error: "Impossible de charger les abonnements" }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = await ensureAdminAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const subscription = await registerPushSubscription(body);
    return NextResponse.json(subscription, { status: 201 });
  } catch (error) {
    console.error("registerPushSubscription failed:", error);
    return NextResponse.json({ error: "Impossible d'activer les notifications" }, { status: 502 });
  }
}
