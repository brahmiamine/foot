// Charge `.env` avant que data-source.ts ne lise process.env (DB_HOST/DB_PORT…) :
// sans ça, la migration se rabat sur localhost:3306 au lieu du MariaDB du projet.
import 'dotenv/config';
import paymentsDataSource from './data-source';

async function run(): Promise<void> {
  await paymentsDataSource.initialize();
  try {
    const applied = await paymentsDataSource.runMigrations({
      transaction: 'all',
    });
    console.log(`payments migrations applied: ${applied.length}`);
  } finally {
    await paymentsDataSource.destroy();
  }
}

void run().catch((error: unknown) => {
  console.error('payments migration failed', error);
  process.exitCode = 1;
});
