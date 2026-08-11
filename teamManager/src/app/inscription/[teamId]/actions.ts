"use server";

import { TeamService } from "@/services/TeamService";
import { PlayerApplicationService } from "@/services/PlayerApplicationService";
import { createPlayerApplicationSchema } from "@/types/applications";

/**
 * Soumission publique du formulaire "Inscrire mon enfant" — aucune
 * authentification requise, le club cible est identifié par l'URL
 * (/inscription/[teamId]). Traitement ensuite dans
 * /admin/academy/applications.
 */
export async function submitPlayerApplication(teamId: string, formData: FormData) {
  try {
    const teamService = new TeamService();
    const team = await teamService.findById(teamId);
    if (!team) {
      return { success: false, error: "Club introuvable" };
    }

    const data = createPlayerApplicationSchema.parse({
      childLastName: formData.get("childLastName") as string,
      childFirstName: formData.get("childFirstName") as string,
      birthDate: formData.get("birthDate") as string,
      category: formData.get("category") as string,
      position: (formData.get("position") as string) || undefined,
      parentName: formData.get("parentName") as string,
      parentPhone: formData.get("parentPhone") as string,
      parentEmail: formData.get("parentEmail") as string,
      message: (formData.get("message") as string) || undefined,
      documentUrl: (formData.get("documentUrl") as string) || undefined,
    });

    const service = new PlayerApplicationService();
    await service.create(teamId, data);

    return { success: true, message: "Votre candidature a bien été envoyée. Le club vous recontactera prochainement." };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de l'envoi de la candidature" };
  }
}
