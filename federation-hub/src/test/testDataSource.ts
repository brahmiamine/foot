import 'reflect-metadata'
import { DataSource } from 'typeorm'
import {
  Arbitre,
  AuditLog,
  Contact,
  CritereDefinitionEntity,
  Federation,
  Journee,
  League,
  Match,
  MatchSagaCase,
  MatchSagaStep,
  Saison,
  Sheet,
  StaffInvitation,
  Team,
  TeamAffiliation,
  User,
  Vote,
  VoteAlert,
  RefereeOfficialEvaluation,
  OfficialRefereeCriterion,
} from '@/lib/entities'

/**
 * Builds a fresh, isolated in-memory SQLite DataSource with the real
 * TypeORM entities/schema. Used by integration tests to exercise real
 * SQL (queries, joins, relations) without depending on a MySQL server.
 *
 * Not a full MySQL substitute: raw `dataSource.query(...)` calls written
 * in MySQL-specific SQL (backticks, MySQL functions) are not covered here.
 */
export async function createTestDataSource(): Promise<DataSource> {
  const dataSource = new DataSource({
    type: 'better-sqlite3',
    database: ':memory:',
    dropSchema: true,
    synchronize: true,
    entities: [
      Arbitre,
      AuditLog,
      CritereDefinitionEntity,
      Contact,
      Federation,
      League,
      Journee,
      Match,
      MatchSagaCase,
      MatchSagaStep,
      Saison,
      Sheet,
      StaffInvitation,
      Team,
      TeamAffiliation,
      User,
      Vote,
      VoteAlert,
      RefereeOfficialEvaluation,
      OfficialRefereeCriterion,
    ],
  })

  await dataSource.initialize()
  return dataSource
}
