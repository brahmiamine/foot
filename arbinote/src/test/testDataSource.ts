import 'reflect-metadata'
import { DataSource } from 'typeorm'
import {
  Arbitre,
  Contact,
  CritereDefinitionEntity,
  Federation,
  Journee,
  League,
  Match,
  Saison,
  Team,
  Vote,
  VoteAlert,
  ArbiNoteVotingPolicy,
  ArbiNoteConfigurationAudit,
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
      CritereDefinitionEntity,
      Contact,
      Federation,
      League,
      Journee,
      Match,
      Saison,
      Team,
      Vote,
      VoteAlert,
      ArbiNoteVotingPolicy,
      ArbiNoteConfigurationAudit,
    ],
  })

  await dataSource.initialize()
  return dataSource
}
