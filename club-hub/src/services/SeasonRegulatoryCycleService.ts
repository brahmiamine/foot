import { SeasonRegulatoryCycle } from "@/entities/SeasonRegulatoryCycle";
import { getDataSource } from "@/lib/database";
import { isRegulatoryWindowOpen } from "../../../packages/regulatory-shared/src/seasonRegulatoryCycle";

/**
 * Lecture seule : la fédération est seule source de vérité du cycle
 * réglementaire (voir federation-hub/src/lib/seasonRegulatoryCycles.ts).
 * Absence de cycle pour une saison = comportement historique inchangé
 * (fenêtre considérée ouverte), voir migration-v2.md §36.
 */
export async function isClubLicensingWindowOpen(seasonId: string): Promise<boolean> {
  const dataSource = await getDataSource();
  const cycle = await dataSource.getRepository(SeasonRegulatoryCycle).findOne({ where: { seasonId } });
  if (!cycle) return true;
  return isRegulatoryWindowOpen(cycle.status, cycle.clubLicensingOpenAt, cycle.clubLicensingCloseAt);
}

export async function isRegistrationWindowOpen(seasonId: string): Promise<boolean> {
  const dataSource = await getDataSource();
  const cycle = await dataSource.getRepository(SeasonRegulatoryCycle).findOne({ where: { seasonId } });
  if (!cycle) return true;
  return isRegulatoryWindowOpen(cycle.status, cycle.registrationOpenAt, cycle.registrationCloseAt);
}
