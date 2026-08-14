import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { storeRegulatoryDocument } from "@/lib/regulatoryDocumentStorage";
import { addPersonLicenseDocument, getPersonLicenseBundleForClub } from "@/services/PersonLicenseService";
import { isPersonLicenseEditable, PersonLicenseWorkflowError } from "../../../../../../../../../packages/regulatory-shared/src/personLicensing";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN" && session.user.role !== "CLUB_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { id } = await params;
    const form = await request.formData();
    const file = form.get("file");
    const documentType = String(form.get("documentType") ?? "");
    if (!(file instanceof File) || !documentType) return NextResponse.json({ error: "file et documentType sont requis" }, { status: 400 });
    const bundle = await getPersonLicenseBundleForClub(session.user.teamId, id);
    if (!isPersonLicenseEditable(bundle.license.status)) throw new PersonLicenseWorkflowError("La demande n'est pas modifiable");
    const stored = await storeRegulatoryDocument(session.user.teamId, id, file);
    const publicBaseUrl = process.env.CLUB_HUB_PUBLIC_URL ?? new URL(request.url).origin;
    const document = await addPersonLicenseDocument(session.user.teamId, id, {
      userId: session.user.id,
      role: session.user.role,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request.headers.get("user-agent"),
    }, { documentType, ...stored, fileUrl: new URL(stored.fileUrl, publicBaseUrl).toString() });
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    if (error instanceof PersonLicenseWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 });
    const message = error instanceof Error ? error.message : "Erreur serveur";
    console.error("Error uploading person license document:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
