"use server";

import { revalidatePath } from "next/cache";
import { PlayerApplicationService } from "@/services/PlayerApplicationService";
import { requireTeamId } from "@/lib/team-context";
import { applicationStatusSchema } from "@/types/applications";

export async function updatePlayerApplicationStatus(id: number, formData: FormData) {
  try {
    const data = applicationStatusSchema.parse({
      status: formData.get("status") as string,
      adminNotes: (formData.get("adminNotes") as string) || null,
    });

    const teamId = await requireTeamId();
    await new PlayerApplicationService().updateStatus(id, teamId, data.status, data.adminNotes);

    revalidatePath("/admin/academy/applications");
    return { success: true, message: "Candidature mise à jour" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la mise à jour" };
  }
}

export async function deletePlayerApplication(id: number) {
  try {
    const teamId = await requireTeamId();
    await new PlayerApplicationService().delete(id, teamId);
    revalidatePath("/admin/academy/applications");
    return { success: true, message: "Candidature supprimée" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}
