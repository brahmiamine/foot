"use server";

import { revalidatePath } from "next/cache";
import { RecruitmentService } from "@/services/RecruitmentService";
import { requireTeamId } from "@/lib/team-context";
import { recruitmentNeedSchema } from "@/types/recruitment";
import { applicationStatusSchema } from "@/types/applications";

export async function createNeed(formData: FormData) {
  try {
    const data = recruitmentNeedSchema.parse({
      category: formData.get("category") as string,
      position: formData.get("position") as string,
      descriptionFr: (formData.get("descriptionFr") as string) || null,
      descriptionAr: (formData.get("descriptionAr") as string) || null,
      isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
      displayOrder: parseInt((formData.get("displayOrder") as string) || "0", 10),
    });

    const teamId = await requireTeamId();
    await new RecruitmentService().createNeed(teamId, data);

    revalidatePath("/admin/recruitment");
    return { success: true, message: "Poste ajouté" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la création" };
  }
}

export async function updateNeed(id: number, formData: FormData) {
  try {
    const data = recruitmentNeedSchema.parse({
      category: formData.get("category") as string,
      position: formData.get("position") as string,
      descriptionFr: (formData.get("descriptionFr") as string) || null,
      descriptionAr: (formData.get("descriptionAr") as string) || null,
      isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
      displayOrder: parseInt((formData.get("displayOrder") as string) || "0", 10),
    });

    const teamId = await requireTeamId();
    await new RecruitmentService().updateNeed(id, teamId, data);

    revalidatePath("/admin/recruitment");
    return { success: true, message: "Poste modifié" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la modification" };
  }
}

export async function deleteNeed(id: number) {
  try {
    const teamId = await requireTeamId();
    await new RecruitmentService().deleteNeed(id, teamId);
    revalidatePath("/admin/recruitment");
    return { success: true, message: "Poste supprimé" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}

export async function updateRecruitmentApplicationStatus(id: number, formData: FormData) {
  try {
    const data = applicationStatusSchema.parse({
      status: formData.get("status") as string,
      adminNotes: (formData.get("adminNotes") as string) || null,
    });

    const teamId = await requireTeamId();
    await new RecruitmentService().updateApplicationStatus(id, teamId, data.status, data.adminNotes);

    revalidatePath("/admin/recruitment/applications");
    return { success: true, message: "Candidature mise à jour" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la mise à jour" };
  }
}

export async function deleteRecruitmentApplication(id: number) {
  try {
    const teamId = await requireTeamId();
    await new RecruitmentService().deleteApplication(id, teamId);
    revalidatePath("/admin/recruitment/applications");
    return { success: true, message: "Candidature supprimée" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}
