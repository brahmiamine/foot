"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getUserAccess, requirePermission } from "@/lib/access";
import { requireTeamId } from "@/lib/team-context";
import { AuditLogService } from "@/services/AuditLogService";
import { SupporterCommunityAdminService, type CommunityModerationStatus } from "@/services/SupporterCommunityAdminService";

type Result = { success: true } | { success: false; error: string };
type CommunityPermission = "community.moderate" | "community.manage";

async function context(permission: CommunityPermission) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");
  const access = await getUserAccess();
  requirePermission(access, permission);
  const teamId = await requireTeamId();
  return {
    teamId,
    actorId: session.user.id,
    actorName: session.user.name ?? session.user.email ?? "Club",
    service: new SupporterCommunityAdminService(),
    audit: new AuditLogService(),
  };
}

function done() {
  revalidatePath("/admin/supporter-community");
}

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function moderateCommunityPostAction(id: string, status: CommunityModerationStatus): Promise<Result> {
  try {
    const { teamId, actorId, service, audit } = await context("community.moderate");
    await service.moderatePost(teamId, id, actorId, status);
    await audit.create({
      userId: actorId,
      action: "UPDATE",
      entity: "SupporterCommunityPost",
      entityId: id,
      after: { status, teamId },
    });
    done();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur de modération" };
  }
}

export async function moderateCommunityCommentAction(id: string, status: CommunityModerationStatus): Promise<Result> {
  try {
    const { teamId, actorId, service, audit } = await context("community.moderate");
    await service.moderateComment(teamId, id, actorId, status);
    await audit.create({
      userId: actorId,
      action: "UPDATE",
      entity: "SupporterCommunityComment",
      entityId: id,
      after: { status, teamId },
    });
    done();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur de modération" };
  }
}

export async function createCommunityPollAction(formData: FormData): Promise<Result> {
  try {
    const { teamId, actorId, service, audit } = await context("community.manage");
    const optionsFr = text(formData, "optionsFr").split(/\r?\n/).filter(Boolean);
    const optionsAr = text(formData, "optionsAr").split(/\r?\n/);
    const id = await service.createPoll({
      teamId,
      actorId,
      questionFr: text(formData, "questionFr"),
      questionAr: text(formData, "questionAr"),
      optionsFr,
      optionsAr,
      endsAt: text(formData, "endsAt") || null,
    });
    await audit.create({ userId: actorId, action: "CREATE", entity: "SupporterCommunityPoll", entityId: id, after: { teamId } });
    done();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur de création" };
  }
}

export async function closeCommunityPollAction(id: string): Promise<Result> {
  try {
    const { teamId, actorId, service, audit } = await context("community.manage");
    await service.closePoll(teamId, id);
    await audit.create({ userId: actorId, action: "UPDATE", entity: "SupporterCommunityPoll", entityId: id, after: { status: "CLOSED", teamId } });
    done();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur de fermeture" };
  }
}

export async function publishCommunityClubPostAction(formData: FormData): Promise<Result> {
  try {
    const { teamId, actorId, actorName, service, audit } = await context("community.manage");
    const visibility = text(formData, "visibility") === "MEMBER" ? "MEMBER" : "PUBLIC";
    const id = await service.publishClubPost({
      teamId,
      actorId,
      actorName,
      title: text(formData, "title"),
      body: text(formData, "body"),
      visibility,
    });
    await audit.create({ userId: actorId, action: "CREATE", entity: "SupporterCommunityClubPost", entityId: id, after: { teamId, visibility } });
    done();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur de publication" };
  }
}

export async function createSupporterGroupAction(formData: FormData): Promise<Result> {
  try {
    const { teamId, actorId, service, audit } = await context("community.manage");
    const id = await service.createGroup({
      teamId,
      actorId,
      name: text(formData, "name"),
      description: text(formData, "description"),
    });
    await audit.create({ userId: actorId, action: "CREATE", entity: "SupporterGroup", entityId: id, after: { teamId } });
    done();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur de création" };
  }
}

export async function createSupporterGroupEventAction(formData: FormData): Promise<Result> {
  try {
    const { teamId, actorId, service, audit } = await context("community.manage");
    const id = await service.createGroupEvent({
      teamId,
      actorId,
      groupId: text(formData, "groupId"),
      title: text(formData, "title"),
      description: text(formData, "description"),
      location: text(formData, "location"),
      startsAt: text(formData, "startsAt"),
    });
    await audit.create({ userId: actorId, action: "CREATE", entity: "SupporterGroupEvent", entityId: id, after: { teamId } });
    done();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur de création" };
  }
}
