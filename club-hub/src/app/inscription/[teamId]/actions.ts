"use server";

import { getDataSource } from "@/lib/database";
import { MoreThanOrEqual } from "typeorm";
import { TeamService } from "@/services/TeamService";
import { PlayerApplicationService } from "@/services/PlayerApplicationService";
import { PlayerApplication } from "@/entities/PlayerApplication";
import { PublicFormSettingsService } from "@/services/PublicFormSettingsService";
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
      return { success: false, messageKey: "common.errors.clubNotFound" as const };
    }

    // OB-001 : garde serveur unique (ouverture/fenêtre/rate limit), la page
    // publique n'a elle-même aucune logique d'autorisation.
    await new PublicFormSettingsService().assertOpen(teamId, "ACADEMY", async (windowStart) => {
      const ds = await getDataSource();
      return ds
        .getRepository(PlayerApplication)
        .count({ where: { teamId, createdAt: MoreThanOrEqual(windowStart) } });
    });

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

    return { success: true, messageKey: "academy.application.feedback.success" as const };
  } catch {
    return { success: false, messageKey: "academy.application.feedback.error" as const };
  }
}
