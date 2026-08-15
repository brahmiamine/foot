import type { DataSource, EntityManager } from "typeorm";
import { SeasonRegulatoryCycle } from "@/entities/SeasonRegulatoryCycle";
import { getDataSource } from "@/lib/database";
import { isRegulatoryWindowOpen } from "../../../packages/regulatory-shared/src/seasonRegulatoryCycle";

type WindowName = "clubLicensing" | "personLicensing" | "registration" | "competitionEntry" | "financialCompliance";
type RepositorySource = DataSource | EntityManager;

async function isWindowOpen(seasonId: string, name: WindowName, repositorySource?: RepositorySource): Promise<boolean> {
  const source = repositorySource ?? await getDataSource();
  const cycle = await source.getRepository(SeasonRegulatoryCycle).findOne({ where: { seasonId } });
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
export const isClubLicensingWindowOpen = (seasonId: string, source?: RepositorySource) => isWindowOpen(seasonId, "clubLicensing", source);
export const isPersonLicensingWindowOpen = (seasonId: string, source?: RepositorySource) => isWindowOpen(seasonId, "personLicensing", source);
export const isRegistrationWindowOpen = (seasonId: string, source?: RepositorySource) => isWindowOpen(seasonId, "registration", source);
export const isCompetitionEntryWindowOpen = (seasonId: string, source?: RepositorySource) => isWindowOpen(seasonId, "competitionEntry", source);
export const isFinancialComplianceWindowOpen = (seasonId: string, source?: RepositorySource) => isWindowOpen(seasonId, "financialCompliance", source);
