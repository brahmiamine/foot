import { SeasonRegulatoryCycle } from "@/entities/SeasonRegulatoryCycle";
import { getDataSource } from "@/lib/database";
import { isRegulatoryWindowOpen } from "../../../packages/regulatory-shared/src/seasonRegulatoryCycle";

type WindowName = "clubLicensing" | "personLicensing" | "registration" | "competitionEntry" | "financialCompliance";

async function isWindowOpen(seasonId: string, name: WindowName): Promise<boolean> {
  const dataSource = await getDataSource();
  const cycle = await dataSource.getRepository(SeasonRegulatoryCycle).findOne({ where: { seasonId } });
  if (!cycle) return true;
  const open = {
    clubLicensing: cycle.clubLicensingOpenAt,
    personLicensing: cycle.personLicensingOpenAt,
    registration: cycle.registrationOpenAt,
    competitionEntry: cycle.competitionEntryOpenAt,
    financialCompliance: cycle.financialComplianceOpenAt,
  }[name];
  const close = {
    clubLicensing: cycle.clubLicensingCloseAt,
    personLicensing: cycle.personLicensingCloseAt,
    registration: cycle.registrationCloseAt,
    competitionEntry: cycle.competitionEntryCloseAt,
    financialCompliance: cycle.financialComplianceCloseAt,
  }[name];
  return isRegulatoryWindowOpen(cycle.status, open, close);
}

/** Absence de cycle = comportement historique ouvert ; présence d'un cycle = garde fédérale stricte. */
export const isClubLicensingWindowOpen = (seasonId: string) => isWindowOpen(seasonId, "clubLicensing");
export const isPersonLicensingWindowOpen = (seasonId: string) => isWindowOpen(seasonId, "personLicensing");
export const isRegistrationWindowOpen = (seasonId: string) => isWindowOpen(seasonId, "registration");
export const isCompetitionEntryWindowOpen = (seasonId: string) => isWindowOpen(seasonId, "competitionEntry");
export const isFinancialComplianceWindowOpen = (seasonId: string) => isWindowOpen(seasonId, "financialCompliance");
