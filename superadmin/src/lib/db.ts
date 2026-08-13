import 'reflect-metadata'
import { DataSource } from 'typeorm'
import {
  Arbitre,
  AuditLog,
  Card,
  CardReason,
  CritereDefinitionEntity,
  Contact,
  Federation,
  Goal,
  Injury,
  Journee,
  League,
  Match,
  MatchSagaCase,
  MatchSagaStep,
  Player,
  Saison,
  Sheet,
  StaffInvitation,
  Substitution,
  Team,
  TeamAffiliation,
  TeamBranding,
  User,
  Vote,
  VoteAlert,
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
    // Toujours false : cette base est partagée avec l'app "ob" (Prisma gère ses
    // propres tables/colonnes dessus). Un synchronize=true tenterait de réaligner
    // le schéma sur les seules entités TypeORM et pourrait supprimer les colonnes/
    // tables ajoutées pour ob.
    synchronize: false,
    entities: [Arbitre, AuditLog, Card, CardReason, CritereDefinitionEntity, Contact, Federation, Goal, Injury, League, Journee, Match, MatchSagaCase, MatchSagaStep, Player, Saison, Sheet, StaffInvitation, Substitution, Team, TeamAffiliation, TeamBranding, User, Vote, VoteAlert],
    extra: {
      decimalNumbers: true,
    },
  })
}

// Entités requises à vérifier — les classes elles-mêmes (pas juste leur nom),
// car en dev, next.js peut compiler la route qui a créé la DataSource et la
// route qui l'utilise dans deux bundles webpack séparés : les deux imports de
// "./entities" produisent alors deux instances de classe distinctes pour le
// même nom. `entityMetadatas.some(m => m.name === 'Team')` resterait vrai dans
// ce cas (le nom matche) alors que `getRepository(Team)` échoue quand même
// (TypeORM compare par référence de classe, pas par nom, quand la cible est
// une classe). `dataSource.hasMetadata(EntityClass)` reproduit la même
// comparaison par référence que `getRepository`, donc détecte ce cas précis.
const REQUIRED_ENTITY_CLASSES = [Contact, VoteAlert, AuditLog, User, Team]

function hasAllRequiredEntities(dataSource: DataSource): boolean {
  return REQUIRED_ENTITY_CLASSES.every((entityClass) => dataSource.hasMetadata(entityClass))
}

/**
 * Next.js peut déclencher plusieurs appels concurrents à getDataSource() (ex:
 * layout + page rendus en parallèle) avant la fin de la première
 * initialisation. Sans verrou, chaque appel concurrent créait sa propre
 * DataSource et écrasait celle des autres en cours de route, laissant
 * certains appelants avec une instance non entièrement initialisée
 * ("No metadata for X was found"). On mémorise donc la promesse
 * d'initialisation en cours pour que tout le monde attende la MÊME instance.
 */
export async function getDataSource(): Promise<DataSource> {
  // En développement, toujours vérifier et réinitialiser si des entités manquent
  if (process.env.NODE_ENV === 'development' && globalForDataSource.dataSource?.isInitialized) {
    if (!hasAllRequiredEntities(globalForDataSource.dataSource)) {
      console.log('Some required entities not found in metadata, reinitializing DataSource...')
      try {
        await globalForDataSource.dataSource.destroy()
      } catch (e) {
        console.error('Error destroying DataSource:', e)
      }
      delete globalForDataSource.dataSource
      delete globalForDataSource.dataSourceInit
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
