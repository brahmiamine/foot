"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUserAccess, requireCategory, requirePermission } from "@/lib/access";
import { requireTeamId } from "@/lib/team-context";
import { PlayerService } from "@/services/PlayerService";
import { DisciplineRuleService } from "@/services/DisciplineRuleService";
import { AuditLogService } from "@/services/AuditLogService";

const competitionTypeSchema = z.enum(["championnat", "coupe", "tournois"]);
const valuesSchema = z.object({
  yellowWarningThreshold: z.number().int().min(0).max(20),
  yellowSuspensionThreshold: z.number().int().min(1).max(20),
  yellowSuspensionMatches: z.number().int().min(1).max(20),
  yellowFineAmount: z.number().min(0).max(1_000_000),
  redFineAmount: z.number().min(0).max(1_000_000),
  fineDueDays: z.number().int().min(1).max(365),
  defaultRedSuspensionMatches: z.number().int().min(1).max(20),
  defaultDoubleYellowSuspensionMatches: z.number().int().min(1).max(20),
}).refine((value) => value.yellowWarningThreshold < value.yellowSuspensionThreshold, {
  message: "Le seuil d'alerte doit être inférieur au seuil de suspension",
});

function requiredNumber(formData: FormData, key: string): number {
  const value = formData.get(key);
  return Number(value);
}

function optionalNumber(formData: FormData, key: string): number | undefined {
  const value = String(formData.get(key) ?? "").trim();
  return value === "" ? undefined : Number(value);
}

function parseDate(value: FormDataEntryValue | null, required: boolean): Date | null {
  const raw = String(value ?? "").trim();
  if (!raw) {
    if (required) throw new Error("Date obligatoire");
    return null;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw new Error("Date invalide");
  return date;
}

async function context() {
  const access = await getUserAccess();
  requirePermission(access, "discipline.manage");
  const teamId = await requireTeamId();
  if (teamId !== access.teamId) throw new Error("Contexte club incohérent");
  return { access, teamId };
}

function requireGlobalCategoryScope(categories: "ALL" | readonly string[]) {
  if (categories !== "ALL") {
    throw new Error("Cette action transverse exige un périmètre sur toutes les catégories");
  }
}

export async function createDisciplineRuleSetAction(formData: FormData) {
  try {
    const { access, teamId } = await context();
    const category = String(formData.get("category") ?? "").trim() || null;
    if (category) requireCategory(access, category);
    else requireGlobalCategoryScope(access.categories);

    const values = valuesSchema.parse({
      yellowWarningThreshold: requiredNumber(formData, "yellowWarningThreshold"),
      yellowSuspensionThreshold: requiredNumber(formData, "yellowSuspensionThreshold"),
      yellowSuspensionMatches: requiredNumber(formData, "yellowSuspensionMatches"),
      yellowFineAmount: requiredNumber(formData, "yellowFineAmount"),
      redFineAmount: requiredNumber(formData, "redFineAmount"),
      fineDueDays: requiredNumber(formData, "fineDueDays"),
      defaultRedSuspensionMatches: requiredNumber(formData, "defaultRedSuspensionMatches"),
      defaultDoubleYellowSuspensionMatches: requiredNumber(formData, "defaultDoubleYellowSuspensionMatches"),
    });
    const competitionRaw = String(formData.get("competitionType") ?? "").trim();
    const competitionType = competitionRaw ? competitionTypeSchema.parse(competitionRaw) : null;
    const validFrom = parseDate(formData.get("validFrom"), true)!;
    const validUntil = parseDate(formData.get("validUntil"), false);
    const reason = String(formData.get("reason") ?? "");

    const rule = await new DisciplineRuleService().createRuleSet(teamId, {
      ...values,
      seasonId: String(formData.get("seasonId") ?? "").trim() || null,
      competitionType,
      category,
      validFrom,
      validUntil,
      reason,
    }, access.userId);
    await new AuditLogService().create({
      userId: access.userId,
      action: "CREATE",
      entity: "DisciplineRuleSet",
      entityId: rule.id,
      after: { teamId, version: rule.version, seasonId: rule.seasonId, competitionType, category, reason: rule.reason },
    });
    revalidatePath("/admin/discipline/rules");
    return { success: true, message: `Règle v${rule.version} créée` };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Création impossible" };
  }
}

export async function createDisciplineOverrideAction(formData: FormData) {
  try {
    const { access, teamId } = await context();
    const targetType = z.enum(["MATCH", "PLAYER"]).parse(formData.get("targetType"));
    const targetId = String(formData.get("targetId") ?? "").trim();
    if (!targetId) throw new Error("Cible obligatoire");
    if (targetType === "MATCH") {
      requireGlobalCategoryScope(access.categories);
    } else {
      const player = await new PlayerService().findById(targetId, teamId);
      if (!player) throw new Error("Joueur introuvable pour ce club");
      requireCategory(access, player.category);
    }

    const values = {
      yellowWarningThreshold: optionalNumber(formData, "yellowWarningThreshold"),
      yellowSuspensionThreshold: optionalNumber(formData, "yellowSuspensionThreshold"),
      yellowSuspensionMatches: optionalNumber(formData, "yellowSuspensionMatches"),
      yellowFineAmount: optionalNumber(formData, "yellowFineAmount"),
      redFineAmount: optionalNumber(formData, "redFineAmount"),
      fineDueDays: optionalNumber(formData, "fineDueDays"),
      defaultRedSuspensionMatches: optionalNumber(formData, "defaultRedSuspensionMatches"),
      defaultDoubleYellowSuspensionMatches: optionalNumber(formData, "defaultDoubleYellowSuspensionMatches"),
    };
    const override = await new DisciplineRuleService().createOverride(teamId, {
      targetType,
      targetId,
      validFrom: parseDate(formData.get("validFrom"), true)!,
      validUntil: parseDate(formData.get("validUntil"), false),
      reason: String(formData.get("reason") ?? ""),
      values,
    }, access.userId);
    await new AuditLogService().create({
      userId: access.userId,
      action: "CREATE",
      entity: "DisciplineRuleOverride",
      entityId: override.id,
      after: { teamId, targetType, targetId, values, reason: override.reason },
    });
    revalidatePath("/admin/discipline/rules");
    return { success: true, message: "Override disciplinaire créé" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Override impossible" };
  }
}

export async function revokeDisciplineOverrideAction(overrideId: string, formData: FormData) {
  try {
    const { access, teamId } = await context();
    const service = new DisciplineRuleService();
    const override = (await service.listOverrides(teamId)).find((item) => item.id === overrideId);
    if (!override) throw new Error("Override disciplinaire introuvable");
    if (override.targetType === "MATCH") {
      requireGlobalCategoryScope(access.categories);
    } else {
      const player = await new PlayerService().findById(override.targetId, teamId);
      if (!player) throw new Error("Joueur introuvable pour ce club");
      requireCategory(access, player.category);
    }
    const reason = String(formData.get("reason") ?? "");
    const revoked = await service.revokeOverride(teamId, overrideId, access.userId, reason);
    await new AuditLogService().create({
      userId: access.userId,
      action: "UPDATE",
      entity: "DisciplineRuleOverride",
      entityId: overrideId,
      before: { revokedAt: override.revokedAt },
      after: { revokedAt: revoked.revokedAt, revocationReason: revoked.revocationReason },
    });
    revalidatePath("/admin/discipline/rules");
    return { success: true, message: "Override révoqué" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Révocation impossible" };
  }
}
