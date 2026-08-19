"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getUserAccess } from "@/lib/access";
import { requireTeamId } from "@/lib/team-context";
import { CLUB_FEATURES } from "@/entities/ClubFeatureSettings";
import { ClubFeatureSettingsService } from "@/services/ClubFeatureSettingsService";

function requestIp(headersList: Headers): string | null {
  const forwarded = headersList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return headersList.get("x-real-ip");
}

export async function updateClubFeatureSettings(formData: FormData): Promise<void> {
  const access = await getUserAccess();
  if (!access.isClubAdmin) throw new Error("Action réservée à l'administrateur du club");
  const teamId = await requireTeamId();
  const reason = String(formData.get("reason") ?? "");
  const service = new ClubFeatureSettingsService();
  const current = await service.listEffective(teamId, CLUB_FEATURES);
  const requestHeaders = await headers();

  const context = {
    actorUserId: access.userId,
    actorRole: access.actorRole ?? "ADMIN",
    reason,
    ipAddress: requestIp(requestHeaders),
    userAgent: requestHeaders.get("user-agent"),
  };

  await Promise.all(
    CLUB_FEATURES.map(async (feature) => {
      const enabled = formData.get(`feature_${feature}`) === "on";
      if (current[feature].enabled === enabled) return;
      await service.update(teamId, feature, enabled, context);
    }),
  );

  revalidatePath("/admin/club-settings/features");
  revalidatePath("/admin/academy");
  revalidatePath("/admin/recruitment");
  revalidatePath("/admin/sponsors");
  revalidatePath("/admin/billetterie");
  revalidatePath("/admin/marketplace");
}
