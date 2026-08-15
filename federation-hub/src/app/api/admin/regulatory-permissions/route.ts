import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, canAccessPlatform } from "@/lib/adminAuth";
import { getDataSource } from "@/lib/db";
import { listRegulatoryPermissions, REGULATORY_PERMISSIONS, replaceRegulatoryPermissions } from "@/lib/regulatoryPermissions";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessPlatform(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ permissions: REGULATORY_PERMISSIONS });
  return NextResponse.json({ userId, permissions: await listRegulatoryPermissions(await getDataSource(), userId), available: REGULATORY_PERMISSIONS });
}

export async function PUT(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessPlatform(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await request.json();
    if (!body.userId || !Array.isArray(body.permissions)) return NextResponse.json({ error: "userId et permissions requis" }, { status: 400 });
    return NextResponse.json({ userId: body.userId, permissions: await replaceRegulatoryPermissions(await getDataSource(), session, String(body.userId), body.permissions.map(String)) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur" }, { status: 400 });
  }
}
