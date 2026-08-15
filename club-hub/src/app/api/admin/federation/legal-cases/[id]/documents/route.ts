import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { addLegalCaseResponse } from "@/services/LegalCaseService";
import { LegalCaseWorkflowError } from "../../../../../../../../../packages/regulatory-shared/src/legalCase";
export const runtime = "nodejs";

const canManage = (role: string) => role === "ADMIN" || role === "CLUB_ADMIN";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  try {
    const body = await request.json() as Record<string, unknown>;
    if (!body.fileUrl || !body.fileName || !body.mimeType || !body.checksum) return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
    const actor = { userId: session.user.id, role: session.user.role, ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, userAgent: request.headers.get("user-agent") };
    const document = await addLegalCaseResponse(session.user.teamId, id, { fileUrl: String(body.fileUrl), fileName: String(body.fileName), mimeType: String(body.mimeType), size: Number(body.size ?? 0), checksum: String(body.checksum), note: body.note ? String(body.note) : null }, actor);
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    if (error instanceof LegalCaseWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Error adding legal case document:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
