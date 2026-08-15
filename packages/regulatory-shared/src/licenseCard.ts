import type { PersonLicenseStatus, PersonLicenseType } from "./personLicensing";

export type LicenseCardLocale = "fr" | "ar";

export interface PersonLicenseCardRecord {
  id: string;
  personType: PersonLicenseType;
  personReferenceId: string;
  userId: string | null;
  clubId: string | null;
  federationId: string;
  seasonId: string;
  licenseType: string;
  licenseNumber: string | null;
  category: string | null;
  status: PersonLicenseStatus;
  expiresAt: Date | string | null;
  seasonName: string | null;
  clubName: string | null;
  clubLogoUrl: string | null;
  federationCode: string | null;
  federationName: string | null;
  federationLogoUrl: string | null;
}

export interface LicenseCardQueryExecutor {
  query(sql: string, parameters?: unknown[]): Promise<unknown>;
}

export interface PersonLicenseCardSelector {
  personTypes: readonly PersonLicenseType[];
  userId?: string | null;
  personReferenceIds?: readonly string[];
  clubId?: string | null;
  limit?: number;
}

const ROLE_LABELS: Record<PersonLicenseType, Record<LicenseCardLocale, string>> = {
  PLAYER: { fr: "Joueur", ar: "لاعب" },
  COACH: { fr: "Entraîneur", ar: "مدرب" },
  STAFF: { fr: "Staff", ar: "إطار" },
  MEDICAL: { fr: "Staff médical", ar: "إطار طبي" },
  DIRECTOR: { fr: "Dirigeant", ar: "مسير" },
  REFEREE: { fr: "Arbitre", ar: "حكم" },
  MATCH_OFFICIAL: { fr: "Officiel de match", ar: "مسؤول مباراة" },
};

const STATUS_LABELS: Record<PersonLicenseStatus, Record<LicenseCardLocale, string>> = {
  DRAFT: { fr: "Brouillon", ar: "مسودة" },
  SUBMITTED: { fr: "Déposée", ar: "مودعة" },
  UNDER_REVIEW: { fr: "En étude", ar: "قيد الدراسة" },
  APPROVED: { fr: "Valide", ar: "صالحة" },
  REJECTED: { fr: "Rejetée", ar: "مرفوضة" },
  SUSPENDED: { fr: "Suspendue", ar: "معلقة" },
  EXPIRED: { fr: "Expirée", ar: "منتهية" },
  REVOKED: { fr: "Révoquée", ar: "مسحوبة" },
};

export function getLicenseRoleLabel(personType: PersonLicenseType, locale: LicenseCardLocale = "fr"): string {
  return ROLE_LABELS[personType][locale];
}

export function getEffectiveLicenseStatus(
  status: PersonLicenseStatus,
  expiresAt?: Date | string | null,
  now = new Date(),
): PersonLicenseStatus {
  if (status === "APPROVED" && expiresAt && new Date(expiresAt).getTime() <= now.getTime()) return "EXPIRED";
  return status;
}

export function getLicenseStatusLabel(
  status: PersonLicenseStatus,
  expiresAt?: Date | string | null,
  locale: LicenseCardLocale = "fr",
): string {
  return STATUS_LABELS[getEffectiveLicenseStatus(status, expiresAt)][locale];
}

export function isIssuedLicense(status: PersonLicenseStatus, licenseNumber?: string | null): boolean {
  return Boolean(licenseNumber) && ["APPROVED", "SUSPENDED", "EXPIRED", "REVOKED"].includes(status);
}

export async function listPersonLicenseCards(
  executor: LicenseCardQueryExecutor,
  selector: PersonLicenseCardSelector,
): Promise<PersonLicenseCardRecord[]> {
  if (selector.personTypes.length === 0) return [];

  const identityClauses: string[] = [];
  const identityParams: unknown[] = [];
  if (selector.userId) {
    identityClauses.push("pl.user_id = ?");
    identityParams.push(selector.userId);
  }
  const references = [...new Set((selector.personReferenceIds ?? []).filter(Boolean))];
  if (references.length > 0) {
    identityClauses.push(`pl.person_reference_id IN (${references.map(() => "?").join(",")})`);
    identityParams.push(...references);
  }
  if (identityClauses.length === 0) return [];

  const params: unknown[] = [...identityParams, ...selector.personTypes];
  const clubClause = selector.clubId ? "AND (pl.club_id = ? OR pl.club_id IS NULL)" : "";
  if (selector.clubId) params.push(selector.clubId);
  const limit = Math.min(20, Math.max(1, Math.trunc(selector.limit ?? 10)));

  const rows = await executor.query(
    `SELECT
       pl.id,
       pl.person_type AS personType,
       pl.person_reference_id AS personReferenceId,
       pl.user_id AS userId,
       pl.club_id AS clubId,
       pl.federation_id AS federationId,
       pl.season_id AS seasonId,
       pl.license_type AS licenseType,
       pl.license_number AS licenseNumber,
       pl.category,
       pl.status,
       pl.expires_at AS expiresAt,
       s.nom AS seasonName,
       t.nom AS clubName,
       t.logo_url AS clubLogoUrl,
       f.code AS federationCode,
       f.nom AS federationName,
       f.logo_url AS federationLogoUrl
     FROM person_licenses pl
     LEFT JOIN saisons s ON s.id = pl.season_id
     LEFT JOIN teams t ON t.id = pl.club_id
     LEFT JOIN federations f ON f.id = pl.federation_id
     WHERE (${identityClauses.join(" OR ")})
       AND pl.person_type IN (${selector.personTypes.map(() => "?").join(",")})
       ${clubClause}
     ORDER BY COALESCE(s.date_debut, pl.approved_at, pl.created_at) DESC, pl.updated_at DESC
     LIMIT ${limit}`,
    params,
  );

  return Array.isArray(rows) ? rows as PersonLicenseCardRecord[] : [];
}
