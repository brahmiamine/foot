import { NextRequest, NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import { MatchOfficialDesignationPolicyService, type UpdateDesignationPolicyInput } from "@/services/MatchOfficialDesignationPolicyService";

export const runtime = "nodejs";

const service = new MatchOfficialDesignationPolicyService();

/** REF-006 — administration de la policy de désignation (mode + critères) par federation-hub. */
export async function GET(request: NextRequest) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;
  return NextResponse.json(await service.get());
}

export async function PUT(request: NextRequest) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as UpdateDesignationPolicyInput;
    const actorUserId = request.headers.get("x-actor-user-id")?.trim() || "service:federation-hub";
    const policy = await service.update(body, actorUserId);
    return NextResponse.json(policy);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Impossible de modifier la policy de désignation" },
      { status: 400 },
    );
  }
}
