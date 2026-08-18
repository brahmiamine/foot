"use server";

import { revalidatePath } from "next/cache";
import { getUserAccess } from "@/lib/access";
import { requireTeamId } from "@/lib/team-context";
import { PublicFormSettingsService } from "@/services/PublicFormSettingsService";
import { PUBLIC_FORM_DOMAINS, type PublicFormDomain } from "@/entities/PublicFormSettings";
import { AuditLogService } from "@/services/AuditLogService";

function readDomain(formData: FormData): PublicFormDomain {
  const value = String(formData.get("domain") ?? "");
  if (!PUBLIC_FORM_DOMAINS.includes(value as PublicFormDomain)) {
    throw new Error(`Domaine de formulaire invalide : ${value}`);
  }
  return value as PublicFormDomain;
}

function readOptionalInt(formData: FormData, key: string): number | null {
  const raw = formData.get(key);
  if (raw === null || raw === "") return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) throw new Error(`Valeur invalide pour ${key}`);
  return value;
}

function readOptionalDate(formData: FormData, key: string): Date | null {
  const raw = formData.get(key);
  if (raw === null || raw === "") return null;
  const date = new Date(String(raw));
  if (Number.isNaN(date.getTime())) throw new Error(`Date invalide pour ${key}`);
  return date;
}

export async function updatePublicFormSettings(formData: FormData): Promise<void> {
  const access = await getUserAccess();
  if (!access.isClubAdmin) throw new Error("Action réservée à l'administrateur du club");
  const teamId = await requireTeamId();
  const domain = readDomain(formData);
  const service = new PublicFormSettingsService();

  const before = await service.get(teamId, domain);
  const after = await service.update(
    teamId,
    domain,
    {
      isOpen: formData.get("isOpen") === "on",
      opensAt: readOptionalDate(formData, "opensAt"),
      closesAt: readOptionalDate(formData, "closesAt"),
      rateLimitMax: readOptionalInt(formData, "rateLimitMax"),
      rateLimitWindowMinutes: readOptionalInt(formData, "rateLimitWindowMinutes"),
    },
    access.userId,
  );

  await new AuditLogService().create({
    userId: access.userId,
    action: "UPDATE",
    entity: "PublicFormSettings",
    entityId: `${teamId}:${domain}`,
    before,
    after,
  });
  revalidatePath("/admin/settings/public-forms");
}
