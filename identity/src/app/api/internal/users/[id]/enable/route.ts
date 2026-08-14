import { NextRequest, NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import { updateUser } from "@/lib/identityService";

export const runtime = "nodejs";

/** POST /api/internal/users/[id]/enable — raccourci sur PATCH { isActive: true }, voir TS-54. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const result = await updateUser(id, { isActive: true });
  if (!result.ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(result.user);
}
