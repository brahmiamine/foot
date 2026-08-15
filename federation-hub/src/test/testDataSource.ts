import 'reflect-metadata'
import { DataSource } from 'typeorm'
import {
  Arbitre, AuditLog, Contact, CritereDefinitionEntity, Federation, Journee, League, Match,
  MatchSagaCase, MatchSagaStep, Saison, Sheet, StaffInvitation, Team, TeamAffiliation, User,
  Vote, VoteAlert, RefereeOfficialEvaluation, OfficialRefereeCriterion, RefereeMatchReport,
  RefereeUnavailability, ClubLicenseApplication, ClubSanction, ClubSanctionHistory,
  CompetitionRegistration, CompetitionRegistrationHistory, FinancialCompliance,
  FinancialComplianceHistory, StadiumInspection, StadiumInspectionHistory, StadiumRestriction,
  CoachQualification, CoachQualificationHistory, SeasonRegulatoryCycle, SeasonRegulatoryCycleHistory,
  TransferWindow, TransferWindowHistory,
} from '@/lib/entities'

export async function createTestDataSource(): Promise<DataSource> {
  const dataSource = new DataSource({
    type: 'better-sqlite3', database: ':memory:', dropSchema: true, synchronize: true,
    entities: [
      Arbitre, AuditLog, CritereDefinitionEntity, Contact, Federation, League, Journee, Match,
      MatchSagaCase, MatchSagaStep, Saison, Sheet, StaffInvitation, Team, TeamAffiliation, User,
      Vote, VoteAlert, RefereeOfficialEvaluation, OfficialRefereeCriterion, RefereeMatchReport,
      RefereeUnavailability, ClubLicenseApplication, ClubSanction, ClubSanctionHistory,
      CompetitionRegistration, CompetitionRegistrationHistory, FinancialCompliance,
      FinancialComplianceHistory, StadiumInspection, StadiumInspectionHistory, StadiumRestriction,
      CoachQualification, CoachQualificationHistory, SeasonRegulatoryCycle, SeasonRegulatoryCycleHistory,
      TransferWindow, TransferWindowHistory,
    ],
  })
  await dataSource.initialize()
  return dataSource
}
