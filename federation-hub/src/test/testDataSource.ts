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

  // `regulatory_user_permissions` est volontairement gérée par migration SQL
  // (identity est propriétaire du RBAC) et n'a pas d'entité TypeORM dans
  // federation-hub. Les tests SQLite doivent néanmoins reproduire cette table
  // partagée afin que getAdminSession exerce le même contrôle qu'en MariaDB.
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS regulatory_user_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id VARCHAR(191) NOT NULL,
      permission VARCHAR(100) NOT NULL,
      granted_by VARCHAR(191),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, permission)
    )
  `)

  // FED-011 : même logique que regulatory_user_permissions ci-dessus — table
  // gérée par migration SQL (pas d'entité TypeORM), reproduite ici pour que
  // getAdminSession -> hasRegulatoryPermission exerce le même contrôle qu'en
  // MariaDB (mode LEGACY/WARN/ENFORCE + journal des refus en mode WARN).
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS regulatory_permission_mode_settings (
      id VARCHAR(20) PRIMARY KEY,
      mode VARCHAR(20) NOT NULL DEFAULT 'LEGACY',
      updated_by VARCHAR(191),
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS regulatory_permission_warnings (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(191) NOT NULL,
      permission VARCHAR(191) NOT NULL,
      pathname VARCHAR(500),
      occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  return dataSource
}
