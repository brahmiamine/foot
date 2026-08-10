"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, requirePermission } from "@/lib/access";
import { DocumentService } from "@/services/DocumentService";
import { createDocumentSchema } from "@/types/documents";

export async function createDocument(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const teamId = await requireTeamId();
    const access = await getUserAccess();
    requirePermission(access, "documents.manage");

    const data = createDocumentSchema.parse({
      entityType: formData.get("entityType") as string,
      entityId: formData.get("entityId") as string,
      category: (formData.get("category") as string) || "OTHER",
      title: formData.get("title") as string,
      fileUrl: formData.get("fileUrl") as string,
      issuedAt: (formData.get("issuedAt") as string) || null,
      expiresAt: (formData.get("expiresAt") as string) || null,
      notes: (formData.get("notes") as string) || null,
    });

    const service = new DocumentService();
    await service.create(data, teamId, session.user.id);

    revalidatePath("/admin/documents");
    return { success: true, message: "Document ajouté avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de l'ajout" };
  }
}

export async function deleteDocument(id: number) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("Non authentifié");

    const teamId = await requireTeamId();
    const access = await getUserAccess();
    requirePermission(access, "documents.manage");

    const service = new DocumentService();
    await service.delete(id, teamId);

    revalidatePath("/admin/documents");
    return { success: true, message: "Document supprimé avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}
