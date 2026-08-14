/**
 * Crée ou met à jour un compte PLAYER dans la table `User` partagée, lié à
 * un joueur existant (club-hub `Player.id`, même base "foot").
 *
 * Provisionnement uniquement par le club (pas d'auto-inscription, contrairement
 * à MEMBER) : le club-hub n'a pas encore d'écran dédié pour ça (voir
 * avancement.md), ce script est donc le seul point d'entrée pour l'instant.
 *
 * Usage :
 *   PLAYER_EMAIL=ahmed@example.tn PLAYER_PASSWORD=... PLAYER_NAME="Ahmed Ben Ali" \
 *   PLAYER_TEAM_ID=<uuid Team> PLAYER_PLAYER_ID=<id Player> \
 *   DB_HOST=... DB_USER=... DB_PASSWORD=... DB_NAME=foot \
 *   pnpm create-player-account
 *
 * Ce script n'est jamais exécuté automatiquement (pas d'accès à la base de
 * production depuis l'agent) : c'est à l'opérateur de le lancer avec ses
 * propres identifiants de base et le mot de passe qu'il veut donner au
 * compte joueur.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import "reflect-metadata";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { DataSource } from "typeorm";
import { User } from "../src/entities/User";

async function main() {
  const email = process.env.PLAYER_EMAIL;
  const password = process.env.PLAYER_PASSWORD;
  const name = process.env.PLAYER_NAME;
  const teamId = process.env.PLAYER_TEAM_ID;
  const playerId = process.env.PLAYER_PLAYER_ID;

  if (!email || !password || !name || !teamId || !playerId) {
    console.error(
      "PLAYER_EMAIL, PLAYER_PASSWORD, PLAYER_NAME, PLAYER_TEAM_ID et PLAYER_PLAYER_ID sont requis."
    );
    process.exit(1);
  }
  if (password.length < 12) {
    console.error("PLAYER_PASSWORD doit faire au moins 12 caractères.");
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

  // Player est possédée par club-hub — pas d'entité TypeORM importée ici,
  // on vérifie donc par requête brute que le joueur existe bien pour CE club
  // avant de lier un compte dessus.
  const player: Array<{ id: string; teamId: string }> = await dataSource.query(
    "SELECT id, teamId FROM Player WHERE id = ? LIMIT 1",
    [playerId]
  );
  if (player.length === 0) {
    console.error(`Aucun joueur avec id=${playerId} dans Player.`);
    await dataSource.destroy();
    process.exit(1);
  }
  if (player[0].teamId !== teamId) {
    console.error(
      `Le joueur ${playerId} appartient au club ${player[0].teamId}, pas à ${teamId}.`
    );
    await dataSource.destroy();
    process.exit(1);
  }

  const repository = dataSource.getRepository(User);

  const existingByPlayer = await repository.findOne({ where: { playerId } });
  if (existingByPlayer && existingByPlayer.email !== email) {
    console.error(
      `Le joueur ${playerId} est déjà lié à un autre compte (${existingByPlayer.email}).`
    );
    await dataSource.destroy();
    process.exit(1);
  }

  const hashed = await bcrypt.hash(password, 12);
  const existing = await repository.findOne({ where: { email } });

  if (existing) {
    existing.name = name;
    existing.password = hashed;
    existing.role = "PLAYER";
    existing.teamId = teamId;
    existing.playerId = playerId;
    existing.isActive = true;
    await repository.save(existing);
    console.log(`Compte PLAYER mis à jour : ${email} (joueur ${playerId})`);
  } else {
    const user = repository.create({
      id: randomUUID(),
      name,
      email,
      password: hashed,
      role: "PLAYER",
      isActive: true,
      teamId,
      playerId,
    });
    await repository.save(user);
    console.log(`Compte PLAYER créé : ${email} (joueur ${playerId})`);
  }

  await dataSource.destroy();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
