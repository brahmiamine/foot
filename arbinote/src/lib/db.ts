import 'reflect-metadata'
import { DataSource } from 'typeorm'
import {
  Arbitre,
  Card,
  CritereDefinitionEntity,
  Contact,
  Federation,
  Goal,
  Injury,
  Journee,
  League,
  Match,
  Player,
  Saison,
  Substitution,
  Team,
  Vote,
  VoteAlert,
  ArbiNoteVotingPolicy,
  ArbiNoteConfigurationAudit,
} from './entities'

const globalForDataSource = globalThis as unknown as {
  dataSource?: DataSource
  dataSourceInit?: Promise<DataSource>
}

function createDataSource() {
  const {
    DB_HOST,
    DB_PORT,
    DB_USER,
    DB_PASSWORD,
    DB_NAME,
    DB_LOGGING,
  } = process.env

  if (!DB_HOST || !DB_USER || !DB_NAME) {
    throw new Error('Missing MySQL configuration. Please set DB_HOST, DB_USER and DB_NAME in .env.local')
  }

  return new DataSource({
    type: 'mysql',
    host: DB_HOST,
    port: DB_PORT ? Number(DB_PORT) : 3306,
    username: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    logging: DB_LOGGING === 'true',
    // Toujours false : cette base est partagée avec l.app "club-ob" (Prisma gère ses
    // propres tables/colonnes dessus). Un synchronize=true tenterait de réaligner
    // le schéma sur les seules entités TypeORM et pourrait supprimer les colonnes/
    // tables ajoutées pour ob.
    synchronize: false,
    entities: [Arbitre, Card, CritereDefinitionEntity, Contact, Federation, Goal, Injury, League, Journee, Match, Player, Saison, Substitution, Team, Vote, VoteAlert, ArbiNoteVotingPolicy, ArbiNoteConfigurationAudit],
    extra: {
      decimalNumbers: true,
    },
  })
}

// Liste des entités requises à vérifier
const REQUIRED_ENTITIES = [
  { name: 'Contact', tableName: 'contact_messages' },
  { name: 'VoteAlert', tableName: 'vote_alerts' },
  { name: 'ArbiNoteVotingPolicy', tableName: 'arbinote_voting_policies' },
  { name: 'ArbiNoteConfigurationAudit', tableName: 'arbinote_configuration_audit' },
]

function hasAllRequiredEntities(dataSource: DataSource): boolean {
  return REQUIRED_ENTITIES.every((required) =>
    dataSource.entityMetadatas.some(
      (meta) => meta.name === required.name || meta.tableName === required.tableName
    )
  )
}

/**
 * Next.js (dev, `--webpack`) compile certaines routes à la demande dans des
 * chunks distincts : les classes d'entités importées par une route
 * fraîchement compilée peuvent être des objets différents de celles
 * utilisées pour construire la DataSource mise en cache (même fichier
 * source, identité de classe différente). TypeORM résout ses métadonnées
 * par référence de classe, donc `getRepository(X)` échoue avec
 * « No metadata for X was found » bien que la DataSource soit "initialized".
 * On reconstruit alors une DataSource fraîche plutôt que de renvoyer
 * l'instance périmée. Sans effet en production (un seul bundle).
 */
export async function getDataSource(): Promise<DataSource> {
  // Si une instance en cache n'expose pas toutes les entités requises, elle
  // est périmée (chunk recompilé) : on la détruit et on en reconstruit une.
  if (globalForDataSource.dataSource?.isInitialized) {
    if (!hasAllRequiredEntities(globalForDataSource.dataSource)) {
      const stale = globalForDataSource.dataSource
      globalForDataSource.dataSource = undefined
      globalForDataSource.dataSourceInit = undefined
      await stale.destroy().catch(() => {})
    }
  }

  if (globalForDataSource.dataSource?.isInitialized) {
    return globalForDataSource.dataSource
  }

  if (!globalForDataSource.dataSourceInit) {
    const dataSource = createDataSource()
    globalForDataSource.dataSourceInit = dataSource.initialize().then((ds) => {
      globalForDataSource.dataSource = ds

      if (!hasAllRequiredEntities(ds)) {
        console.error('Some required entities not found after DataSource initialization')
        console.log('Available entities:', ds.entityMetadatas.map((m) => ({ name: m.name, tableName: m.tableName })))
      } else {
        console.log('All required entities successfully loaded')
      }

      return ds
    })
  }

  return globalForDataSource.dataSourceInit
}

/**
 * Retourne le repository TypeORM d'une entité même si la classe importée par
 * l'appelant n'est pas *la même référence* que celle enregistrée dans la
 * DataSource (duplication de classes par Webpack en dev, voir ci-dessus). On
 * retombe sur la métadonnée résolue par nom de classe / nom de table, ce qui
 * garantit que `getRepository` ne lève jamais `EntityMetadataNotFoundError`
 * pour une entité réellement enregistrée.
 */
export async function getRepository<Entity extends object>(
  entity: new () => Entity
): Promise<ReturnType<DataSource['getRepository']>> {
  const dataSource = await getDataSource()
  const metadata =
    dataSource.entityMetadatas.find((m) => m.target === entity) ??
    dataSource.entityMetadatas.find((m) => m.name === entity.name)

  if (!metadata) {
    // L'entité n'est pas du tout enregistrée : on laisse TypeORM signaler.
    return dataSource.getRepository(entity)
  }

  return dataSource.getRepository(metadata.target as new () => Entity)
}
