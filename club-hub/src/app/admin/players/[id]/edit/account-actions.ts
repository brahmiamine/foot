"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { PlayerAccountService } from "@/services/PlayerAccountService";
import { AuditLogService } from "@/services/AuditLogService";

export async function invitePlayerHubAccount(playerId: string, formData: FormData) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      throw new Error("Action réservée à l'administrateur du club");
    }

    const email = typeof formData.get("email") === "string" ? String(formData.get("email")) : "";
    const teamId = await requireTeamId();
    const service = new PlayerAccountService();
    const invitation = await service.invite(playerId, teamId, email, session.user.id);

    await new AuditLogService().create({
      userId: session.user.id,
      action: "CREATE",
      entity: "PlayerHubAccountInvitation",
      entityId: playerId,
      after: {
        email: invitation.email,
        userId: invitation.userId,
        expiresAt: invitation.expiresAt,
      },
    });

    revalidatePath(`/admin/players/${playerId}/edit`);
    revalidatePath("/admin/users");
    return {
      success: true,
      message: `Invitation envoyée à ${invitation.email}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Impossible d'envoyer l'invitation",
    };
  }
}
