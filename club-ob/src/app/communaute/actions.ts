"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSsoSession } from "@/lib/ssoSession";
import { getObTeam } from "@/lib/ob-team";
import {
  isCommunityReaction,
  normalizeCommunityText,
  normalizeHttpsImageUrl,
  normalizeOptionalCommunityText,
  parsePredictionScore,
  safeCommunityReturnPath,
} from "@/lib/communityRules";
import { SupporterCommunityService } from "@/services/SupporterCommunityService";
import { SupporterNewsCommunityService } from "@/services/SupporterNewsCommunityService";

async function context() {
  const session = await getSsoSession();
  if (!session || session.role !== "MEMBER") throw new Error("MEMBER_REQUIRED");
  const team = await getObTeam();
  if (!team) throw new Error("TEAM_NOT_FOUND");
  return { session, teamId: team.id, service: new SupporterCommunityService() };
}

function finish(returnTo: FormDataEntryValue | null, result: string, success: boolean): never {
  const path = safeCommunityReturnPath(returnTo);
  revalidatePath("/communaute");
  revalidatePath("/espace-membre/communaute");
  revalidatePath(path);
  redirect(`${path}?community=${success ? result : "error"}`);
}

export async function submitPredictionAction(formData: FormData): Promise<never> {
  let ok = false;
  try {
    const { session, teamId, service } = await context();
    const matchId = normalizeCommunityText(formData.get("matchId"), 36);
    const homeScore = parsePredictionScore(formData.get("homeScore"));
    const awayScore = parsePredictionScore(formData.get("awayScore"));
    const firstScorerId = normalizeOptionalCommunityText(formData.get("firstScorerId"), 191);
    await service.savePrediction({ userId: session.id, teamId, memberName: session.name, matchId, homeScore, awayScore, firstScorerId });
    ok = true;
  } catch (error) {
    console.error("submitPredictionAction failed", error);
  }
  finish(formData.get("returnTo"), "prediction", ok);
}

export async function voteManOfMatchAction(formData: FormData): Promise<never> {
  let ok = false;
  try {
    const { session, teamId, service } = await context();
    const matchId = normalizeCommunityText(formData.get("matchId"), 36);
    const playerId = normalizeCommunityText(formData.get("playerId"), 191);
    await service.voteManOfMatch({ userId: session.id, teamId, memberName: session.name, matchId, playerId });
    ok = true;
  } catch (error) {
    console.error("voteManOfMatchAction failed", error);
  }
  finish(formData.get("returnTo"), "vote", ok);
}

export async function votePollAction(formData: FormData): Promise<never> {
  let ok = false;
  try {
    const { session, teamId, service } = await context();
    const pollId = normalizeCommunityText(formData.get("pollId"), 36);
    const optionId = normalizeCommunityText(formData.get("optionId"), 36);
    await service.votePoll({ userId: session.id, teamId, memberName: session.name, pollId, optionId });
    ok = true;
  } catch (error) {
    console.error("votePollAction failed", error);
  }
  finish(formData.get("returnTo"), "poll", ok);
}

export async function setCommunityReactionAction(formData: FormData): Promise<never> {
  let ok = false;
  try {
    const { session, teamId, service } = await context();
    const targetType = formData.get("targetType");
    if (targetType !== "NEWS" && targetType !== "POST") throw new Error("INVALID_TARGET");
    const targetId = normalizeCommunityText(formData.get("targetId"), 191);
    const reaction = formData.get("reaction");
    if (!isCommunityReaction(reaction)) throw new Error("INVALID_REACTION");

    if (targetType === "NEWS") {
      await new SupporterNewsCommunityService().setReaction({ userId: session.id, teamId, targetId, reaction });
    } else {
      await service.setReaction({
        userId: session.id,
        teamId,
        memberName: session.name,
        targetType: "POST",
        targetId,
        reaction,
      });
    }
    ok = true;
  } catch (error) {
    console.error("setCommunityReactionAction failed", error);
  }
  finish(formData.get("returnTo"), "reaction", ok);
}

export async function submitCommunityCommentAction(formData: FormData): Promise<never> {
  let ok = false;
  try {
    const { session, teamId, service } = await context();
    const targetType = formData.get("targetType");
    if (targetType !== "NEWS" && targetType !== "POST") throw new Error("INVALID_TARGET");
    const targetId = normalizeCommunityText(formData.get("targetId"), 191);
    const body = normalizeCommunityText(formData.get("body"), 1000);

    if (targetType === "NEWS") {
      await new SupporterNewsCommunityService().submitComment({
        userId: session.id,
        teamId,
        memberName: session.name,
        targetId,
        body,
      });
    } else {
      await service.submitComment({
        userId: session.id,
        teamId,
        memberName: session.name,
        targetType: "POST",
        targetId,
        body,
      });
    }
    ok = true;
  } catch (error) {
    console.error("submitCommunityCommentAction failed", error);
  }
  finish(formData.get("returnTo"), "comment", ok);
}

export async function submitCommunityPostAction(formData: FormData): Promise<never> {
  let ok = false;
  try {
    const { session, teamId, service } = await context();
    const body = normalizeCommunityText(formData.get("body"), 1500);
    const imageUrl = normalizeHttpsImageUrl(formData.get("imageUrl"));
    await service.submitPost({ userId: session.id, teamId, memberName: session.name, body, imageUrl });
    ok = true;
  } catch (error) {
    console.error("submitCommunityPostAction failed", error);
  }
  finish(formData.get("returnTo"), "post", ok);
}

export async function saveSupporterPreferencesAction(formData: FormData): Promise<never> {
  let ok = false;
  try {
    const { session, teamId, service } = await context();
    const favoritePlayerId = normalizeOptionalCommunityText(formData.get("favoritePlayerId"), 191);
    const favoriteStand = normalizeOptionalCommunityText(formData.get("favoriteStand"), 120);
    await service.savePreferences({ userId: session.id, teamId, memberName: session.name, favoritePlayerId, favoriteStand });
    ok = true;
  } catch (error) {
    console.error("saveSupporterPreferencesAction failed", error);
  }
  finish(formData.get("returnTo"), "profile", ok);
}

export async function joinSupporterGroupAction(formData: FormData): Promise<never> {
  let ok = false;
  try {
    const { session, teamId, service } = await context();
    const groupId = normalizeCommunityText(formData.get("groupId"), 36);
    await service.joinGroup({ userId: session.id, teamId, memberName: session.name, groupId });
    ok = true;
  } catch (error) {
    console.error("joinSupporterGroupAction failed", error);
  }
  finish(formData.get("returnTo"), "group", ok);
}
