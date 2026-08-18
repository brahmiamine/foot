import { NextRequest, NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import { PublicContentPolicyService } from "@/services/PublicContentPolicyService";

/**
 * GET /api/internal/public-content-policy?teamId=
 * Lecture service-à-service (OB-004) : sections publiques activées et
 * bannière d'urgence résolues PLATFORM -> CLUB, pour un site public (ex.
 * club-ob) qui n'a lui-même aucune logique de résolution de policy.
 */
export async function GET(request: NextRequest) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;

  const teamId = request.nextUrl.searchParams.get("teamId");
  const resolved = await new PublicContentPolicyService().resolve(teamId);
  return NextResponse.json(resolved);
}
