/**
 * Crée ou met à jour un compte SUPERADMIN dans la table `User` partagée.
 *
 * Usage :
 *   SUPERADMIN_EMAIL=admin@foot.tn SUPERADMIN_PASSWORD=... SUPERADMIN_NAME="Super Admin" \
 *   DB_HOST=... DB_USER=... DB_PASSWORD=... DB_NAME=foot \
 *   pnpm seed:superadmin
 *
 * Ce script n'est jamais exécuté automatiquement (pas d'accès à la base de
 * production depuis l'agent) : c'est à l'opérateur de le lancer avec ses
 * propres identifiants de base et le mot de passe qu'il veut donner au
 * compte super-admin.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import "reflect-metadata";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { DataSource } from "typeorm";
import { User } from "../src/entities/User";

async function main() {
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;
  const name = process.env.SUPERADMIN_NAME || "Super Admin";

  if (!email || !password) {
    console.error("SUPERADMIN_EMAIL et SUPERADMIN_PASSWORD sont requis.");
    process.exit(1);
  }
  if (password.length < 12) {
    console.error("SUPERADMIN_PASSWORD doit faire au moins 12 caractères.");
    process.exit(1);
  }

  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  if (!DB_HOST || !DB_USER || !DB_NAME) {
    console.error("DB_HOST, DB_USER et DB_NAME doivent être définis.");
    process.exit(1);
  }

  const dataSource = new DataSource({
    type: "mysql",
    host: DB_HOST,
    port: DB_PORT ? Number(DB_PORT) : 3306,
    username: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    synchronize: false,
    entities: [User],
  });

  await dataSource.initialize();
  const repository = dataSource.getRepository(User);

  const hashed = await bcrypt.hash(password, 12);
  const existing = await repository.findOne({ where: { email } });

  if (existing) {
    existing.name = name;
    existing.password = hashed;
    existing.role = "SUPERADMIN";
    existing.teamId = null;
    existing.isActive = true;
    await repository.save(existing);
    console.log(`Compte SUPERADMIN mis à jour : ${email}`);
  } else {
    const now = new Date();
    const user = repository.create({
      id: randomUUID(),
      name,
      email,
      password: hashed,
      role: "SUPERADMIN",
      isActive: true,
      teamId: null,
      createdAt: now,
      updatedAt: now,
    });
    await repository.save(user);
    console.log(`Compte SUPERADMIN créé : ${email}`);
  }

  await dataSource.destroy();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
