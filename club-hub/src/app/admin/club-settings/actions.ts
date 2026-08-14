"use server";

import { revalidatePath } from "next/cache";
import { TeamSocialsService } from "@/services/TeamSocialsService";
import { ContactService } from "@/services/ContactService";
import { requireTeamId } from "@/lib/team-context";
import { teamSocialsSchema } from "@/types/socials";
import { contactInfoSchema } from "@/types/contact";

export async function saveTeamSocials(formData: FormData) {
  try {
    const data = teamSocialsSchema.parse({
      facebookUrl: (formData.get("facebookUrl") as string) || "",
      instagramUrl: (formData.get("instagramUrl") as string) || "",
      tiktokUrl: (formData.get("tiktokUrl") as string) || "",
      youtubeUrl: (formData.get("youtubeUrl") as string) || "",
      xUrl: (formData.get("xUrl") as string) || "",
    });

    const teamId = await requireTeamId();
    await new TeamSocialsService().save(teamId, data);

    revalidatePath("/admin/club-settings");
    return { success: true, message: "Réseaux sociaux enregistrés" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de l'enregistrement" };
  }
}

export async function saveContactInfo(formData: FormData) {
  try {
    const data = contactInfoSchema.parse({
      addressFr: (formData.get("addressFr") as string) || null,
      addressAr: (formData.get("addressAr") as string) || null,
      phone: (formData.get("phone") as string) || null,
      email: (formData.get("email") as string) || "",
      openingHoursFr: (formData.get("openingHoursFr") as string) || null,
      openingHoursAr: (formData.get("openingHoursAr") as string) || null,
      mapEmbedUrl: (formData.get("mapEmbedUrl") as string) || null,
      adminPhone: (formData.get("adminPhone") as string) || null,
      adminEmail: (formData.get("adminEmail") as string) || null,
      sportPhone: (formData.get("sportPhone") as string) || null,
      sportEmail: (formData.get("sportEmail") as string) || null,
      academyPhone: (formData.get("academyPhone") as string) || null,
      academyEmail: (formData.get("academyEmail") as string) || null,
      partnershipPhone: (formData.get("partnershipPhone") as string) || null,
      partnershipEmail: (formData.get("partnershipEmail") as string) || null,
    });

    const teamId = await requireTeamId();
    await new ContactService().saveInfo(teamId, { ...data, email: data.email || null });

    revalidatePath("/admin/club-settings/contact");
    return { success: true, message: "Coordonnées enregistrées" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de l'enregistrement" };
  }
}

export async function updateMessageStatus(id: number, status: "NEW" | "READ" | "REPLIED") {
  try {
    const teamId = await requireTeamId();
    await new ContactService().updateMessageStatus(id, teamId, status);
    revalidatePath("/admin/club-settings/messages");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur" };
  }
}

export async function deleteMessage(id: number) {
  try {
    const teamId = await requireTeamId();
    await new ContactService().deleteMessage(id, teamId);
    revalidatePath("/admin/club-settings/messages");
    return { success: true, message: "Message supprimé" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}
