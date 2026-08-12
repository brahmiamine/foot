import { NextRequest, NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import { createUser } from "@/lib/identityService";

export const runtime = "nodejs";

/**
 * POST /api/internal/users — création d'un compte staff par une autre app
 * (ex: superadmin, acceptation d'invitation — voir identityClient.ts côté
 * superadmin). Service-à-service uniquement (x-api-key, voir
 * lib/serviceAuth.ts). Remplace l'écriture directe TypeORM que
 * `acceptInvitation` faisait jusqu'ici dans `User` (TS-53, avancement.md).
 */
export async function POST(request: NextRequest) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const { name, email, password, role, teamId } = body ?? {};
  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof role !== "string"
  ) {
    return NextResponse.json({ error: "name, email, password, role requis" }, { status: 400 });
  }

  const result = await createUser({
    name,
    email,
    password,
    role: role as never,
    teamId: typeof teamId === "string" ? teamId : null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: "email_taken" }, { status: 409 });
  }
  return NextResponse.json(result.user, { status: 201 });
}
