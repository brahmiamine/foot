import { NextRequest, NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import { MembershipService } from "@/services/MembershipService";

/**
 * GET /api/internal/memberships?teamId=  -> types de membership actifs.
 * POST /api/internal/memberships         -> candidature (espace membre club-ob).
 * L'appelant (club-ob) a déjà authentifié le membre via sa session SSO ;
 * `userId` transite explicitement car cette route est service-à-service
 * (x-api-key), pas un JWT membre.
 */
export async function GET(request: NextRequest) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;

  const teamId = request.nextUrl.searchParams.get("teamId");
  if (!teamId) return NextResponse.json({ error: "teamId is required" }, { status: 400 });

  const types = await new MembershipService().listTypes(teamId, true);
  return NextResponse.json(
    types.map((type) => ({
      id: type.id,
      code: type.code,
      labelFr: type.labelFr,
      labelAr: type.labelAr,
      requiresApproval: type.requiresApproval,
      durationDays: type.durationDays,
      rights: type.rights ?? [],
    })),
  );
}

export async function POST(request: NextRequest) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;

  const body = (await request.json().catch(() => null)) as
    | { teamId?: string; userId?: string; membershipTypeId?: string }
    | null;
  if (!body?.teamId || !body?.userId || !body?.membershipTypeId) {
    return NextResponse.json({ error: "teamId, userId and membershipTypeId are required" }, { status: 400 });
  }

  try {
    const membership = await new MembershipService().apply(body.teamId, body.userId, body.membershipTypeId);
    return NextResponse.json(membership, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Candidature impossible" },
      { status: 409 },
    );
  }
}
