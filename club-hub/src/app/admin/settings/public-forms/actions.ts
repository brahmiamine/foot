"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getUserAccess } from "@/lib/access";
import { requireTeamId } from "@/lib/team-context";
import { PublicFormSettingsService } from "@/services/PublicFormSettingsService";
import { PUBLIC_FORM_DOMAINS, type PublicFormDomain } from "@/entities/PublicFormSettings";

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

function firstForwardedIp(value: string | null): string | null {
  if (!value) return null;
  return value.split(",")[0]?.trim() || null;
}

export async function updatePublicFormSettings(formData: FormData): Promise<void> {
  const access = await getUserAccess();
  if (!access.isClubAdmin) throw new Error("Action réservée à l'administrateur du club");
  const teamId = await requireTeamId();
  const domain = readDomain(formData);
  const requestHeaders = await headers();

  await new PublicFormSettingsService().update(
    teamId,
    domain,
    {
      isOpen: formData.get("isOpen") === "on",
      opensAt: readOptionalDate(formData, "opensAt"),
      closesAt: readOptionalDate(formData, "closesAt"),
      rateLimitMax: readOptionalInt(formData, "rateLimitMax"),
      rateLimitWindowMinutes: readOptionalInt(formData, "rateLimitWindowMinutes"),
    },
    {
      actorUserId: access.userId,
      actorRole: access.actorRole ?? "CLUB_ADMIN",
      reason: String(formData.get("reason") ?? ""),
      effectiveFrom: readOptionalDate(formData, "effectiveFrom"),
      effectiveUntil: readOptionalDate(formData, "effectiveUntil"),
      ipAddress: firstForwardedIp(requestHeaders.get("x-forwarded-for")),
      userAgent: requestHeaders.get("user-agent"),
    },
  );

  revalidatePath("/admin/settings/public-forms");
}