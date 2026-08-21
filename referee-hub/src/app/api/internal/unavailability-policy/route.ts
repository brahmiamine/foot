import { NextRequest, NextResponse } from "next/server";
import { ensureRefereeServiceAuth } from "@/lib/serviceAuth";
import { RefereeUnavailabilityPolicyService } from "@/services/RefereeUnavailabilityPolicyService";

/** REF-003 — lecture/écriture de la policy PLATFORM depuis un service consommateur (ex: federation-hub). */
export async function GET(request: NextRequest) {
  const authError = ensureRefereeServiceAuth(request);
  if (authError) return authError;
  const resolved = await new RefereeUnavailabilityPolicyService().resolveExplained();
  return NextResponse.json(resolved);
}

export async function POST(request: NextRequest) {
  const authError = ensureRefereeServiceAuth(request);
  if (authError) return authError;

  const body = (await request.json().catch(() => null)) as
    | {
        values?: Record<string, unknown>;
        actorUserId?: unknown;
        actorRole?: unknown;
        reason?: unknown;
        effectiveFrom?: unknown;
        effectiveUntil?: unknown;
      }
    | null;

  if (!body?.values || typeof body.actorUserId !== "string" || typeof body.actorRole !== "string" || typeof body.reason !== "string") {
    return NextResponse.json({ error: "values, actorUserId, actorRole and reason are required" }, { status: 400 });
  }

  try {
    const saved = await new RefereeUnavailabilityPolicyService().upsert({
      values: body.values,
      actorUserId: body.actorUserId,
      actorRole: body.actorRole,
      reason: body.reason,
      effectiveFrom: typeof body.effectiveFrom === "string" ? new Date(body.effectiveFrom) : null,
      effectiveUntil: typeof body.effectiveUntil === "string" ? new Date(body.effectiveUntil) : null,
    });
    return NextResponse.json(saved);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Policy update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
