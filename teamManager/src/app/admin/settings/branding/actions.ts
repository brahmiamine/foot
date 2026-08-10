"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { TeamBrandingService } from "@/services/TeamBrandingService";
import { AuditLogService } from "@/services/AuditLogService";
import { updateBrandingSchema } from "@/types/branding";

/**
 * Identité & apparence du club — réservé au président du club (ADMIN),
 * jamais délégable via le catalogue de rôles (cms_roles/cms_user_roles).
 */
async function requireClubAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Action réservée à l'administrateur du club");
  }
  return session;
}

export async function updateBranding(formData: FormData) {
  try {
    const session = await requireClubAdmin();
    const teamId = await requireTeamId();

    const data = updateBrandingSchema.parse({
      displayName: (formData.get("displayName") as string) || null,
      shortName: (formData.get("shortName") as string) || null,
      logoUrl: (formData.get("logoUrl") as string) || null,
      logoDarkUrl: (formData.get("logoDarkUrl") as string) || null,
      faviconUrl: (formData.get("faviconUrl") as string) || null,
      primaryColor: formData.get("primaryColor") as string,
      secondaryColor: formData.get("secondaryColor") as string,
      accentColor: formData.get("accentColor") as string,
    });

    const service = new TeamBrandingService();
    await service.update(teamId, data);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "UPDATE",
      entity: "TeamBranding",
      entityId: teamId,
      after: data,
    });

    // Le layout /admin résout le branding à chaque requête (force-dynamic) :
    // revalider "/" suffit à rafraîchir logo/couleurs/titre partout après enregistrement.
    revalidatePath("/", "layout");
    return { success: true, message: "Identité du club mise à jour avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la mise à jour" };
  }
}
