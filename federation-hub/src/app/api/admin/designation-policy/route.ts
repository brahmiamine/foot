import { NextRequest, NextResponse } from "next/server";
import { safeErrorMessage } from "@/lib/apiError";
import { canAccessPlatform, getRefereeDomainSession } from "@/lib/adminAuth";
import { getDesignationPolicy, MatchOfficialClientError } from "@/lib/matchOfficialClient";
import { logAdminAction } from "@/lib/auditLog";

export const runtime = "nodejs";

const MATCH_OPERATIONS_URL = process.env.MATCH_OPERATIONS_URL || "http://localhost:3001";
const MATCH_OPERATIONS_SERVICE_API_KEY = process.env.MATCH_OPERATIONS_SERVICE_API_KEY || "";

/**
 * REF-006 — GET/PUT /api/admin/designation-policy : la policy de désignation
 * (MANUAL/SUGGESTED/AUTO + critères) est PLATFORM uniquement, un seul scope
 * global. Lecture ouverte à tout le domaine arbitrage (`getRefereeDomainSession`),
 * écriture réservée aux admins plateforme.
 */
export async function GET(request: NextRequest) {
  const session = await getRefereeDomainSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await getDesignationPolicy());
  } catch (error) {
    if (error instanceof MatchOfficialClientError) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getRefereeDomainSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessPlatform(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const response = await fetch(`${MATCH_OPERATIONS_URL.replace(/\/$/, "")}/api/internal/designation-policy`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "x-api-key": MATCH_OPERATIONS_SERVICE_API_KEY,
        "x-actor-user-id": session.email,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({ error: payload?.error ?? "Requête invalide" }, { status: 400 });
    }

    await logAdminAction({
      request,
      action: "update",
      entityType: "match_official_designation_policy",
      entityId: "PLATFORM",
      summary: `Policy de désignation des officiels mise à jour (mode ${payload.mode})`,
    });

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 500 });
  }
}
