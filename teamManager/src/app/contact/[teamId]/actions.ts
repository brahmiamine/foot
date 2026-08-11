"use server";

import { TeamService } from "@/services/TeamService";
import { ContactService } from "@/services/ContactService";
import { createContactMessageSchema } from "@/types/contact";

/**
 * Soumission publique du formulaire de contact — aucune authentification
 * requise, le club cible est identifié par l'URL (/contact/[teamId]).
 * Traitement ensuite dans /admin/club-settings/messages.
 */
export async function submitContactMessage(teamId: string, formData: FormData) {
  try {
    const teamService = new TeamService();
    const team = await teamService.findById(teamId);
    if (!team) {
      return { success: false, error: "Club introuvable" };
    }

    const data = createContactMessageSchema.parse({
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      subject: formData.get("subject") as string,
      department: (formData.get("department") as string) || "GENERAL",
      message: formData.get("message") as string,
    });

    const service = new ContactService();
    await service.createMessage(teamId, data);

    return { success: true, message: "Votre message a bien été envoyé. Le club vous répondra prochainement." };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de l'envoi du message" };
  }
}
