import notificationsDataSource from './data-source';

async function run(): Promise<void> {
  await notificationsDataSource.initialize();
  try {
    const applied = await notificationsDataSource.runMigrations({ transaction: 'all' });
    console.log(`notifications migrations applied: ${applied.length}`);
  } finally {
    await notificationsDataSource.destroy();
  }
}

void run().catch((error: unknown) => {
  console.error('notifications migration failed', error);
  process.exitCode = 1;
});
