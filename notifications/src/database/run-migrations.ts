// Charge `.env` avant que data-source.ts ne lise process.env (DB_HOST/DB_PORT…) :
// sans ça, la migration se rabat sur localhost:3306 au lieu du MariaDB du projet.
import 'dotenv/config';
import notificationsDataSource from './data-source';

async function run(): Promise<void> {
  await notificationsDataSource.initialize();
  try {
    const applied = await notificationsDataSource.runMigrations({
      transaction: 'all',
    });
    console.log(`notifications migrations applied: ${applied.length}`);
  } finally {
    await notificationsDataSource.destroy();
  }
}

void run().catch((error: unknown) => {
  console.error('notifications migration failed', error);
  process.exitCode = 1;
});
