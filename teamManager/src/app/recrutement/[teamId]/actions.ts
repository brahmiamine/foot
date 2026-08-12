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
      return { success: false, messageKey: "common.errors.clubNotFound" as const };
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

    return { success: true, messageKey: "recruitment.application.feedback.success" as const };
  } catch {
    return { success: false, messageKey: "recruitment.application.feedback.error" as const };
  }
}
