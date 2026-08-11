"use server";

import { revalidatePath } from "next/cache";
import { AcademyService } from "@/services/AcademyService";
import { requireTeamId } from "@/lib/team-context";
import { academyCategorySchema, academyInfoSchema } from "@/types/academy";

export async function createCategory(formData: FormData) {
  try {
    const data = academyCategorySchema.parse({
      code: formData.get("code") as string,
      nameFr: formData.get("nameFr") as string,
      nameAr: (formData.get("nameAr") as string) || null,
      ageRangeFr: (formData.get("ageRangeFr") as string) || null,
      descriptionFr: (formData.get("descriptionFr") as string) || null,
      descriptionAr: (formData.get("descriptionAr") as string) || null,
      isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
      displayOrder: parseInt((formData.get("displayOrder") as string) || "0", 10),
    });

    const teamId = await requireTeamId();
    await new AcademyService().createCategory(teamId, data);

    revalidatePath("/admin/academy");
    return { success: true, message: "Catégorie ajoutée" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la création" };
  }
}

export async function updateCategory(id: number, formData: FormData) {
  try {
    const data = academyCategorySchema.parse({
      code: formData.get("code") as string,
      nameFr: formData.get("nameFr") as string,
      nameAr: (formData.get("nameAr") as string) || null,
      ageRangeFr: (formData.get("ageRangeFr") as string) || null,
      descriptionFr: (formData.get("descriptionFr") as string) || null,
      descriptionAr: (formData.get("descriptionAr") as string) || null,
      isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
      displayOrder: parseInt((formData.get("displayOrder") as string) || "0", 10),
    });

    const teamId = await requireTeamId();
    await new AcademyService().updateCategory(id, teamId, data);

    revalidatePath("/admin/academy");
    return { success: true, message: "Catégorie modifiée" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la modification" };
  }
}

export async function deleteCategory(id: number) {
  try {
    const teamId = await requireTeamId();
    await new AcademyService().deleteCategory(id, teamId);
    revalidatePath("/admin/academy");
    return { success: true, message: "Catégorie supprimée" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}

export async function saveAcademyInfo(formData: FormData) {
  try {
    const data = academyInfoSchema.parse({
      philosophyFr: (formData.get("philosophyFr") as string) || null,
      philosophyAr: (formData.get("philosophyAr") as string) || null,
      methodFr: (formData.get("methodFr") as string) || null,
      methodAr: (formData.get("methodAr") as string) || null,
      supervisionFr: (formData.get("supervisionFr") as string) || null,
      supervisionAr: (formData.get("supervisionAr") as string) || null,
      infrastructureFr: (formData.get("infrastructureFr") as string) || null,
      infrastructureAr: (formData.get("infrastructureAr") as string) || null,
      detectionFr: (formData.get("detectionFr") as string) || null,
      detectionAr: (formData.get("detectionAr") as string) || null,
    });

    const teamId = await requireTeamId();
    await new AcademyService().saveInfo(teamId, data);

    revalidatePath("/admin/academy/info");
    return { success: true, message: "Contenu de la formation enregistré" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de l'enregistrement" };
  }
}
