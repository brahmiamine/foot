import { NextRequest, NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import { deleteUser, getUserById, updateUser } from "@/lib/identityService";

export const runtime = "nodejs";

function parseOptionalInstant(value: unknown): { ok: true; value: Date | null | undefined } | { ok: false } {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === null) return { ok: true, value: null };
  if (typeof value !== "string" || value.trim() === "" || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) {
    return { ok: false };
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { ok: false };
  return { ok: true, value: parsed };
}

/** GET /api/internal/users/[id] — service-à-service (x-api-key). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const user = await getUserById(id);
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(user);
}

/**
 * PATCH /api/internal/users/[id] — Identity-owned account fields. Other apps
 * may request mutations, but only Identity hashes passwords, validates access
 * windows, enforces email uniqueness and persists the User row.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = await request.json();
  const { name, email, isActive, role, password, accessValidFrom, accessValidUntil } = body ?? {};
  if (
    name === undefined &&
    email === undefined &&
    isActive === undefined &&
    role === undefined &&
    password === undefined &&
    accessValidFrom === undefined &&
    accessValidUntil === undefined
  ) {
    return NextResponse.json(
      { error: "name, email, isActive, role, password, accessValidFrom ou accessValidUntil requis" },
      { status: 400 },
    );
  }

  const parsedFrom = parseOptionalInstant(accessValidFrom);
  const parsedUntil = parseOptionalInstant(accessValidUntil);
  if (!parsedFrom.ok || !parsedUntil.ok) {
    return NextResponse.json({ error: "invalid_access_window" }, { status: 400 });
  }

  const result = await updateUser(id, {
    name: typeof name === "string" ? name : undefined,
    email: typeof email === "string" ? email : undefined,
    isActive: typeof isActive === "boolean" ? isActive : undefined,
    role: typeof role === "string" ? (role as never) : undefined,
    password: typeof password === "string" ? password : undefined,
    accessValidFrom: parsedFrom.value,
    accessValidUntil: parsedUntil.value,
  });

  if (!result.ok) {
    if (result.error === "email_taken") {
      return NextResponse.json({ error: "email_taken" }, { status: 409 });
    }
    if (result.error === "invalid_access_window") {
      return NextResponse.json({ error: "invalid_access_window" }, { status: 400 });
    }
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(result.user);
}

/** DELETE /api/internal/users/[id] — service-à-service (x-api-key). */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const result = await deleteUser(id);
  if (!result.ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ success: true });
}