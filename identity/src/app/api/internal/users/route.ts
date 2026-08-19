import { NextRequest, NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import { createUser, getUserByEmail } from "@/lib/identityService";

export const runtime = "nodejs";

function parseOptionalInstant(value: unknown): { ok: true; value: Date | null } | { ok: false } {
  if (value === undefined || value === null) return { ok: true, value: null };
  if (typeof value !== "string" || value.trim() === "") return { ok: false };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { ok: false };
  return { ok: true, value: parsed };
}

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
  const {
    name,
    email,
    password,
    role,
    isActive,
    accessValidFrom,
    accessValidUntil,
    teamId,
    playerId,
    federationId,
    leagueId,
  } = body ?? {};
  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof role !== "string"
  ) {
    return NextResponse.json({ error: "name, email, password, role requis" }, { status: 400 });
  }

  const parsedFrom = parseOptionalInstant(accessValidFrom);
  const parsedUntil = parseOptionalInstant(accessValidUntil);
  if (!parsedFrom.ok || !parsedUntil.ok) {
    return NextResponse.json({ error: "invalid_access_window" }, { status: 400 });
  }

  const result = await createUser({
    name,
    email,
    password,
    role: role as never,
    isActive: typeof isActive === "boolean" ? isActive : undefined,
    accessValidFrom: parsedFrom.value,
    accessValidUntil: parsedUntil.value,
    teamId: typeof teamId === "string" ? teamId : null,
    playerId: typeof playerId === "string" ? playerId : null,
    federationId: typeof federationId === "string" ? federationId : null,
    leagueId: typeof leagueId === "string" ? leagueId : null,
  });

  if (!result.ok) {
    if (result.error === "invalid_access_window") {
      return NextResponse.json({ error: "invalid_access_window" }, { status: 400 });
    }
    return NextResponse.json({ error: "email_taken" }, { status: 409 });
  }
  return NextResponse.json(result.user, { status: 201 });
}