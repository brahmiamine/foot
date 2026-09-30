/**
 * Provisionne un jeu de comptes de test avec mot de passe connu, un par
 * rôle, pour pouvoir se connecter à chaque plateforme en local. Réutilise
 * la connexion `arbinote/.env.local` (base partagée `foot`). Jamais exécuté
 * automatiquement — à lancer manuellement en dev uniquement.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import "reflect-metadata";
import bcrypt from "bcryptjs";
import { DataSource } from "typeorm";
import { User } from "../src/entities/User";

const PASSWORD = "DevPass123!";

const ACCOUNTS: Array<Partial<User> & { id: string; email: string; role: string }> = [
  {
    id: "test-superadmin",
    name: "Test Super Admin",
    email: "superadmin@test.local",
    role: "SUPERADMIN",
  },
  {
    id: "test-club-admin",
    name: "Test Club Admin",
    email: "club-admin@test.local",
    role: "ADMIN",
    teamId: "team-ob",
  },
  {
    id: "test-player",
    name: "Test Player",
    email: "player@test.local",
    role: "PLAYER",
    teamId: "team-ob",
    player_id: "ob-1",
  },
  {
    id: "test-referee",
    name: "Test Referee",
    email: "referee@test.local",
    role: "REFEREE",
  },
  {
    id: "test-member",
    name: "Test Member",
    email: "member@test.local",
    role: "MEMBER",
  },
];

async function main() {
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
  const hashed = await bcrypt.hash(PASSWORD, 12);
  const now = new Date();

  for (const account of ACCOUNTS) {
    const existing = await repository.findOne({ where: { email: account.email } });
    if (existing) {
      existing.password = hashed;
      existing.role = account.role as User["role"];
      existing.teamId = account.teamId ?? existing.teamId ?? null;
      existing.player_id = account.player_id ?? existing.player_id ?? null;
      existing.updatedAt = now;
      await repository.save(existing);
      console.log(`Mis à jour : ${account.email} (${account.role})`);
    } else {
      const user = repository.create({
        id: account.id,
        name: account.name!,
        email: account.email,
        password: hashed,
        role: account.role as User["role"],
        isActive: true,
        teamId: account.teamId ?? null,
        player_id: account.player_id ?? null,
        createdAt: now,
        updatedAt: now,
      });
      await repository.save(user);
      console.log(`Créé : ${account.email} (${account.role})`);
    }
  }

  await dataSource.destroy();
  console.log(`\nMot de passe pour tous les comptes : ${PASSWORD}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
