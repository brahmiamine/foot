"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { SponsorService } from "@/services/SponsorService";
import { AuditLogService } from "@/services/AuditLogService";
import { acceptSponsorRequestSchema, refuseSponsorRequestSchema, updateSponsorSchema } from "@/types/sponsors";

function parseAmount(value: FormDataEntryValue | null): number | null {
  if (!value) return null;
  const num = parseFloat(value as string);
  return Number.isFinite(num) ? num : null;
}

/** Accepte une demande de partenariat : crée le dossier sponsor actif — réservé ADMIN. */
export async function acceptSponsorRequest(id: number, formData: FormData) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const data = acceptSponsorRequestSchema.parse({
      level: formData.get("level") as string,
      logoSize: formData.get("logoSize") as string,
      logoPlacement: formData.getAll("logoPlacement") as string[],
      contractStart: (formData.get("contractStart") as string) || undefined,
      contractEnd: (formData.get("contractEnd") as string) || undefined,
      contractAmount: parseAmount(formData.get("contractAmount")),
      adminNotes: (formData.get("adminNotes") as string) || undefined,
    });

    const teamId = await requireTeamId();
    const sponsorService = new SponsorService();
    const sponsor = await sponsorService.acceptRequest(id, teamId, data, session.user.id);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "UPDATE",
      entity: "SponsorRequest",
      entityId: String(id),
      after: { status: "ACCEPTED", sponsorId: sponsor.id },
    });

    revalidatePath("/admin/sponsors");
    return { success: true, message: "Demande acceptée, le dossier sponsor a été créé" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de l'acceptation" };
  }
}

/** Refuse une demande de partenariat, avec motif — réservé ADMIN. */
export async function refuseSponsorRequest(id: number, formData: FormData) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const data = refuseSponsorRequestSchema.parse({
      adminNotes: formData.get("adminNotes") as string,
    });

    const teamId = await requireTeamId();
    const sponsorService = new SponsorService();
    await sponsorService.refuseRequest(id, teamId, data.adminNotes, session.user.id);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "UPDATE",
      entity: "SponsorRequest",
      entityId: String(id),
      after: { status: "REFUSED", adminNotes: data.adminNotes },
    });

    revalidatePath("/admin/sponsors");
    return { success: true, message: "Demande refusée" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors du refus" };
  }
}

/** Supprime une demande de partenariat (archivage) — réservé ADMIN. */
export async function deleteSponsorRequest(id: number) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const teamId = await requireTeamId();
    const sponsorService = new SponsorService();
    await sponsorService.deleteRequest(id, teamId);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "DELETE",
      entity: "SponsorRequest",
      entityId: String(id),
    });

    revalidatePath("/admin/sponsors");
    return { success: true, message: "Demande supprimée" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}

/** Modifie un dossier sponsor actif (niveau, logo, contrat) — réservé ADMIN. */
export async function updateSponsor(id: number, formData: FormData) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const isActiveValue = formData.get("isActive");

    const data = updateSponsorSchema.parse({
      companyName: (formData.get("companyName") as string) || undefined,
      logoUrl: (formData.get("logoUrl") as string) || undefined,
      logoSize: (formData.get("logoSize") as string) || undefined,
      website: (formData.get("website") as string) || undefined,
      level: (formData.get("level") as string) || undefined,
      logoPlacement: formData.getAll("logoPlacement").length > 0 ? (formData.getAll("logoPlacement") as string[]) : undefined,
      contractStart: (formData.get("contractStart") as string) || undefined,
      contractEnd: (formData.get("contractEnd") as string) || undefined,
      contractAmount: parseAmount(formData.get("contractAmount")),
      isActive: isActiveValue !== null ? isActiveValue === "true" || isActiveValue === "on" : undefined,
    });

    const teamId = await requireTeamId();
    const sponsorService = new SponsorService();
    const sponsor = await sponsorService.updateSponsor(id, teamId, data);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "UPDATE",
      entity: "Sponsor",
      entityId: String(id),
      after: sponsor,
    });

    revalidatePath("/admin/sponsors");
    return { success: true, message: "Sponsor modifié avec succès" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la modification" };
  }
}

/** Supprime un dossier sponsor — réservé ADMIN. */
export async function deleteSponsor(id: number) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Action réservée aux administrateurs du club" };
    }

    const teamId = await requireTeamId();
    const sponsorService = new SponsorService();
    await sponsorService.deleteSponsor(id, teamId);

    const auditLogService = new AuditLogService();
    await auditLogService.create({
      userId: session.user.id,
      action: "DELETE",
      entity: "Sponsor",
      entityId: String(id),
    });

    revalidatePath("/admin/sponsors");
    return { success: true, message: "Sponsor supprimé" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la suppression" };
  }
}
