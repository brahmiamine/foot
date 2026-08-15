import type { LicenseCardQueryExecutor, PersonLicenseCardRecord } from "./licenseCard";

export async function getPersonLicenseCardsByIds(
  executor: LicenseCardQueryExecutor,
  ids: readonly string[],
): Promise<PersonLicenseCardRecord[]> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return [];
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
     WHERE pl.id IN (${uniqueIds.map(() => "?").join(",")})`,
    uniqueIds,
  );
  return Array.isArray(rows) ? rows as PersonLicenseCardRecord[] : [];
}
