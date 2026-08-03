"use server";

import { TeamService } from "@/services/TeamService";
import { SponsorService } from "@/services/SponsorService";
import { createSponsorRequestSchema } from "@/types/sponsors";

/**
 * Soumission publique d'une demande de partenariat sponsor — aucune
 * authentification requise, le club cible est identifié par l'URL
 * (/devenir-sponsor/[teamId]). Le traitement (accepter/refuser) se fait
 * ensuite côté admin dans teamManager.
 */
export async function submitSponsorRequest(teamId: string, formData: FormData) {
  try {
    const teamService = new TeamService();
    const team = await teamService.findById(teamId);
    if (!team) {
      return { success: false, error: "Club introuvable" };
    }

    const data = createSponsorRequestSchema.parse({
      companyName: formData.get("companyName") as string,
      contactName: formData.get("contactName") as string,
      email: formData.get("email") as string,
      phone: (formData.get("phone") as string) || undefined,
      website: (formData.get("website") as string) || undefined,
      logoUrl: (formData.get("logoUrl") as string) || undefined,
      logoSize: (formData.get("logoSize") as string) || undefined,
      proposedLevel: (formData.get("proposedLevel") as string) || undefined,
      message: (formData.get("message") as string) || undefined,
    });

    const sponsorService = new SponsorService();
    await sponsorService.createRequest(data, teamId);

    return { success: true, message: "Votre demande a bien été envoyée. Le club vous recontactera prochainement." };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de l'envoi de la demande" };
  }
}
