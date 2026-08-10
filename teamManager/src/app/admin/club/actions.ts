"use server";

import { revalidatePath } from "next/cache";
import { ClubContentService } from "@/services/ClubContentService";
import { requireTeamId } from "@/lib/team-context";
import { clubInfoSchema, historySchema, historyFigureSchema, honorSchema } from "@/types/club";

export async function saveClubInfo(formData: FormData) {
  try {
    const data = clubInfoSchema.parse({
      presentationFr: (formData.get("presentationFr") as string) || null,
      presentationAr: (formData.get("presentationAr") as string) || null,
      valuesFr: (formData.get("valuesFr") as string) || null,
      valuesAr: (formData.get("valuesAr") as string) || null,
      sportProjectFr: (formData.get("sportProjectFr") as string) || null,
      sportProjectAr: (formData.get("sportProjectAr") as string) || null,
      organizationFr: (formData.get("organizationFr") as string) || null,
      organizationAr: (formData.get("organizationAr") as string) || null,
    });

    const teamId = await requireTeamId();
    await new ClubContentService().saveClubInfo(teamId, data);

    revalidatePath("/admin/club");
    return { success: true, message: "Présentation du club enregistrée" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de l'enregistrement" };
  }
}

export async function saveHistory(formData: FormData) {
  try {
    const data = historySchema.parse({
      foundedDate: (formData.get("foundedDate") as string) || null,
      storyFr: (formData.get("storyFr") as string) || null,
      storyAr: (formData.get("storyAr") as string) || null,
    });

    const teamId = await requireTeamId();
    await new ClubContentService().saveHistory(teamId, data);

    revalidatePath("/admin/club/history");
    return { success: true, message: "Histoire du club enregistrée" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de l'enregistrement" };
  }
}

export async function createFigure(formData: FormData) {
  try {
    const data = historyFigureSchema.parse({
      category: formData.get("category") as string,
      nameFr: formData.get("nameFr") as string,
      nameAr: (formData.get("nameAr") as string) || null,
      periodFr: (formData.get("periodFr") as string) || null,
      descriptionFr: (formData.get("descriptionFr") as string) || null,
      descriptionAr: (formData.get("descriptionAr") as string) || null,
      photoUrl: (formData.get("photoUrl") as string) || null,
      displayOrder: parseInt((formData.get("displayOrder") as string) || "0", 10),
    });

    const teamId = await requireTeamId();
    await new ClubContentService().createFigure(teamId, data);

    revalidatePath("/admin/club/figures");
    return { success: true, message: "Figure ajoutée" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la création" };
  }
}

export async function updateFigure(id: number, formData: FormData) {
  try {
    const data = historyFigureSchema.parse({
      category: formData.get("category") as string,
      nameFr: formData.get("nameFr") as string,
      nameAr: (formData.get("nameAr") as string) || null,
      periodFr: (formData.get("periodFr") as string) || null,
      descriptionFr: (formData.get("descriptionFr") as string) || null,
      descriptionAr: (formData.get("descriptionAr") as string) || null,
      photoUrl: (formData.get("photoUrl") as string) || null,
      displayOrder: parseInt((formData.get("displayOrder") as string) || "0", 10),
    });

    const teamId = await requireTeamId();
    await new ClubContentService().updateFigure(id, teamId, data);

    revalidatePath("/admin/club/figures");
    return { success: true, message: "Figure modifiée" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la modification" };
  }
}

export async function deleteFigure(id: number) {
  try {
    const teamId = await requireTeamId();
    await new ClubContentService().deleteFigure(id, teamId);
    revalidatePath("/admin/club/figures");
    return { success: true, message: "Figure supprimée" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}

export async function createHonor(formData: FormData) {
  try {
    const data = honorSchema.parse({
      competitionFr: formData.get("competitionFr") as string,
      competitionAr: (formData.get("competitionAr") as string) || null,
      titleCount: parseInt((formData.get("titleCount") as string) || "0", 10),
      yearsFr: (formData.get("yearsFr") as string) || null,
      icon: (formData.get("icon") as string) || null,
      displayOrder: parseInt((formData.get("displayOrder") as string) || "0", 10),
    });

    const teamId = await requireTeamId();
    await new ClubContentService().createHonor(teamId, data);

    revalidatePath("/admin/club/honors");
    return { success: true, message: "Palmarès ajouté" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la création" };
  }
}

export async function updateHonor(id: number, formData: FormData) {
  try {
    const data = honorSchema.parse({
      competitionFr: formData.get("competitionFr") as string,
      competitionAr: (formData.get("competitionAr") as string) || null,
      titleCount: parseInt((formData.get("titleCount") as string) || "0", 10),
      yearsFr: (formData.get("yearsFr") as string) || null,
      icon: (formData.get("icon") as string) || null,
      displayOrder: parseInt((formData.get("displayOrder") as string) || "0", 10),
    });

    const teamId = await requireTeamId();
    await new ClubContentService().updateHonor(id, teamId, data);

    revalidatePath("/admin/club/honors");
    return { success: true, message: "Palmarès modifié" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la modification" };
  }
}

export async function deleteHonor(id: number) {
  try {
    const teamId = await requireTeamId();
    await new ClubContentService().deleteHonor(id, teamId);
    revalidatePath("/admin/club/honors");
    return { success: true, message: "Palmarès supprimé" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}
