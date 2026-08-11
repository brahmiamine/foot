"use server";

import { TeamService } from "@/services/TeamService";
import { RecruitmentService } from "@/services/RecruitmentService";
import { createRecruitmentApplicationSchema } from "@/types/recruitment";

/**
 * Soumission publique du formulaire de recrutement/détection — aucune
 * authentification requise, le club cible est identifié par l'URL
 * (/recrutement/[teamId]). Traitement ensuite dans
 * /admin/recruitment/applications.
 */
export async function submitRecruitmentApplication(teamId: string, formData: FormData) {
  try {
    const teamService = new TeamService();
    const team = await teamService.findById(teamId);
    if (!team) {
      return { success: false, error: "Club introuvable" };
    }

    const data = createRecruitmentApplicationSchema.parse({
      name: formData.get("name") as string,
      birthDate: formData.get("birthDate") as string,
      category: formData.get("category") as string,
      position: formData.get("position") as string,
      currentClub: (formData.get("currentClub") as string) || undefined,
      parentPhone: formData.get("parentPhone") as string,
      email: (formData.get("email") as string) || undefined,
      videoUrl: (formData.get("videoUrl") as string) || undefined,
      message: (formData.get("message") as string) || undefined,
    });

    const service = new RecruitmentService();
    await service.createApplication(teamId, { ...data, email: data.email || null });

    return { success: true, message: "Votre candidature a bien été envoyée. Le club vous recontactera prochainement." };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de l'envoi de la candidature" };
  }
}
