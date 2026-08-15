import { NextRequest, NextResponse } from "next/server";
import { ensureServiceAuth } from "@/lib/serviceAuth";
import { deleteUser, getUserById, updateUser } from "@/lib/identityService";

export const runtime = "nodejs";

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
 * may request mutations, but only Identity hashes passwords, enforces email
 * uniqueness and persists the User row.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = await request.json();
  const { name, email, isActive, role, password } = body ?? {};
  if (
    name === undefined &&
    email === undefined &&
    isActive === undefined &&
    role === undefined &&
    password === undefined
  ) {
    return NextResponse.json(
      { error: "name, email, isActive, role ou password requis" },
      { status: 400 },
    );
  }

  const result = await updateUser(id, {
    name: typeof name === "string" ? name : undefined,
    email: typeof email === "string" ? email : undefined,
    isActive: typeof isActive === "boolean" ? isActive : undefined,
    role: typeof role === "string" ? (role as never) : undefined,
    password: typeof password === "string" ? password : undefined,
  });

  if (!result.ok) {
    if (result.error === "email_taken") {
      return NextResponse.json({ error: "email_taken" }, { status: 409 });
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
