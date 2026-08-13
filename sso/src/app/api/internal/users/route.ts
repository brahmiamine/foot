import { NextRequest, NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import { createUser, getUserByEmail } from "@/lib/identityService";

export const runtime = "nodejs";

/**
 * GET /api/internal/users?email=... — TASK-P0-013 (todo.md). Permet à
 * l'appelant de vérifier si un compte existe déjà pour cet email, pour
 * distinguer un vrai conflit d'un retry idempotent après un `email_taken`
 * sur POST (voir superadmin/src/lib/staffInvitations.ts, acceptInvitation).
 */
export async function GET(request: NextRequest) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;

  const email = request.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "email requis" }, { status: 400 });
  }

  const user = await getUserByEmail(email);
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(user);
}

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
