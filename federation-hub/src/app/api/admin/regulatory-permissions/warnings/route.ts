import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, canAccessPlatform } from "@/lib/adminAuth";
import { getDataSource } from "@/lib/db";
import { listRegulatoryPermissionWarnings } from "@/lib/regulatoryPermissions";
import { toPlainArray } from "@/lib/serialization";

export const runtime = "nodejs";

/** FED-011 : journal des refus qu'un passage en ENFORCE provoquerait, accumulé pendant le mode WARN. */
export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessPlatform(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(toPlainArray(await listRegulatoryPermissionWarnings(await getDataSource())));
}
