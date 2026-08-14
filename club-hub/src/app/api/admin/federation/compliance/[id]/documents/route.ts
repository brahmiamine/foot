import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { storeRegulatoryDocument } from "@/lib/regulatoryDocumentStorage";
import { addClubLicenseDocument, getClubLicenseBundleForClub } from "@/services/ClubLicenseService";
import { ClubLicenseWorkflowError, isClubEditableStatus } from "../../../../../../../../../packages/regulatory-shared/src/clubLicensing";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user.teamId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN" && session.user.role !== "CLUB_ADMIN") {
    return NextResponse.json({ error: "Action réservée à l’administrateur du club" }, { status: 403 });
  }
  try {
    const { id } = await params;
    const form = await request.formData();
    const file = form.get("file");
    const requirementId = String(form.get("requirementId") ?? "");
    const documentType = String(form.get("documentType") ?? "");
    if (!(file instanceof File) || !requirementId || !documentType) {
      return NextResponse.json({ error: "file, requirementId et documentType sont requis" }, { status: 400 });
    }
    const bundle = await getClubLicenseBundleForClub(session.user.teamId, id);
    if (!isClubEditableStatus(bundle.application.status)) {
      throw new ClubLicenseWorkflowError("Le dossier n'est pas modifiable dans son statut actuel");
    }
    const requirement = bundle.requirements.find((item) => item.id === requirementId);
    if (!requirement || requirement.code !== documentType) {
      throw new ClubLicenseWorkflowError("Exigence ou type de document invalide");
    }
    const stored = await storeRegulatoryDocument(session.user.teamId, id, file);
    const publicBaseUrl = process.env.CLUB_HUB_PUBLIC_URL ?? new URL(request.url).origin;
    const document = await addClubLicenseDocument(
      session.user.teamId,
      id,
      {
        userId: session.user.id,
        role: session.user.role,
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: request.headers.get("user-agent"),
      },
      { requirementId, documentType, ...stored, fileUrl: new URL(stored.fileUrl, publicBaseUrl).toString() },
    );
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    if (error instanceof ClubLicenseWorkflowError) return NextResponse.json({ error: error.message }, { status: 409 });
    const message = error instanceof Error ? error.message : "Erreur serveur";
    console.error("Error uploading regulatory document:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
