import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, canAccessPlatform } from "@/lib/adminAuth";
import { getDataSource } from "@/lib/db";
import { getRegulatoryPermissionMode, REGULATORY_PERMISSION_MODES, setRegulatoryPermissionMode } from "@/lib/regulatoryPermissions";

export const runtime = "nodejs";

/** FED-011 : mode global LEGACY/WARN/ENFORCE de migration vers une whitelist réglementaire complète. */
export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessPlatform(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ mode: await getRegulatoryPermissionMode(await getDataSource()), available: REGULATORY_PERMISSION_MODES });
}

export async function PUT(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessPlatform(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await request.json();
    const mode = await setRegulatoryPermissionMode(await getDataSource(), session, body.mode);
    return NextResponse.json({ mode });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur" }, { status: 400 });
  }
}
