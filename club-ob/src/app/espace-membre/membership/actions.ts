"use server";

import { revalidatePath } from "next/cache";
import { getSsoSession } from "@/lib/ssoSession";
import { getObTeam } from "@/lib/ob-team";
import { submitMembershipApplication } from "@/lib/clubHubApi";

async function requireMember() {
  const session = await getSsoSession();
  if (!session || session.role !== "MEMBER") throw new Error("Member authentication required");
  return session;
}

/** OB-002 : candidature de membership, soumise côté serveur vers club-hub — jamais un claim client. */
export async function applyMembershipAction(formData: FormData): Promise<void> {
  const session = await requireMember();
  const team = await getObTeam();
  if (!team) throw new Error("Club indisponible");

  const membershipTypeId = String(formData.get("membershipTypeId") ?? "");
  if (!membershipTypeId) throw new Error("Type de membership requis");

  await submitMembershipApplication(team.id, session.id, membershipTypeId);
  revalidatePath("/espace-membre/membership");
}
