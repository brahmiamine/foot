import { NextRequest, NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import { createUser, getUserByEmail } from "@/lib/identityService";

export const runtime = "nodejs";

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

export async function POST(request: NextRequest) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const { name, email, password, role, isActive, teamId, playerId, federationId, leagueId } = body ?? {};
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
    isActive: typeof isActive === "boolean" ? isActive : undefined,
    teamId: typeof teamId === "string" ? teamId : null,
    playerId: typeof playerId === "string" ? playerId : null,
    federationId: typeof federationId === "string" ? federationId : null,
    leagueId: typeof leagueId === "string" ? leagueId : null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: "email_taken" }, { status: 409 });
  }
  return NextResponse.json(result.user, { status: 201 });
}
