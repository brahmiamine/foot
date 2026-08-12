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
 * PATCH /api/internal/users/[id] — isActive/role/password. Remplace
 * l'écriture directe TypeORM que `updateClubUser` (superadmin) faisait
 * jusqu'ici dans `User` (TS-53, avancement.md). `/disable` et `/enable`
 * (voir dossiers voisins) sont des raccourcis vers ce même endpoint pour
 * le seul champ `isActive`, conformément aux exemples de TS-54.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = ensureServiceAuth(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = await request.json();
  const { isActive, role, password } = body ?? {};
  if (isActive === undefined && role === undefined && password === undefined) {
    return NextResponse.json({ error: "isActive, role ou password requis" }, { status: 400 });
  }

  const result = await updateUser(id, {
    isActive: typeof isActive === "boolean" ? isActive : undefined,
    role: typeof role === "string" ? (role as never) : undefined,
    password: typeof password === "string" ? password : undefined,
  });

  if (!result.ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
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
