"use server";

import { getDataSource } from "@/lib/database";
import { MoreThanOrEqual } from "typeorm";
import { TeamService } from "@/services/TeamService";
import { ContactService } from "@/services/ContactService";
import { ContactMessage } from "@/entities/ContactMessage";
import { PublicFormSettingsService } from "@/services/PublicFormSettingsService";
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
      return { success: false, messageKey: "common.errors.clubNotFound" as const };
    }

    // OB-001 : garde serveur unique (ouverture/fenêtre/rate limit), la page
    // publique n'a elle-même aucune logique d'autorisation.
    await new PublicFormSettingsService().assertOpen(teamId, "CONTACT", async (windowStart) => {
      const ds = await getDataSource();
      return ds
        .getRepository(ContactMessage)
        .count({ where: { teamId, createdAt: MoreThanOrEqual(windowStart) } });
    });

    const data = createContactMessageSchema.parse({
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      subject: formData.get("subject") as string,
      department: (formData.get("department") as string) || "GENERAL",
      message: formData.get("message") as string,
    });

    const service = new ContactService();
    await service.createMessage(teamId, data);

    return { success: true, messageKey: "contact.form.feedback.success" as const };
  } catch {
    return { success: false, messageKey: "contact.form.feedback.error" as const };
  }
}
