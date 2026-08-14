import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { getDataSource } from "./db";
import { User } from "@/entities/User";

/**
 * API Identity interne (TS-53/TS-54, Epic E17) : `sso` est l'unique
 * propriétaire de `User` (voir TS-30) — les autres apps qui ont besoin de
 * créer/désactiver/réactiver un compte staff (aujourd'hui : `federation-hub`,
 * voir src/lib/identityClient.ts côté federation-hub) passent par ces
 * fonctions plutôt que d'écrire directement dans la table.
 */

export interface IdentityUser {
  id: string;
  name: string;
  email: string;
  role: User["role"];
  isActive: boolean;
  teamId: string | null;
  /** Scope FEDERATION_ADMIN (migration.md §0/§7-8), `null` pour tout autre rôle. */
  federationId: string | null;
  /** Scope LEAGUE_ADMIN (migration.md §0/§7-8), `null` pour tout autre rôle. */
  leagueId: string | null;
  createdAt: Date;
}

function toIdentityUser(user: User): IdentityUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    teamId: user.teamId ?? null,
    federationId: user.federationId ?? null,
    leagueId: user.leagueId ?? null,
    createdAt: user.createdAt,
  };
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: User["role"];
  teamId: string | null;
  federationId?: string | null;
  leagueId?: string | null;
}

export type CreateUserResult =
  | { ok: true; user: IdentityUser }
  | { ok: false; error: "email_taken" };

/** Seul endroit qui hache un mot de passe pour un compte créé par une autre app (ex: acceptation d'invitation côté federation-hub). */
export async function createUser(input: CreateUserInput): Promise<CreateUserResult> {
  const dataSource = await getDataSource();
  const repository = dataSource.getRepository(User);

  const existing = await repository.findOne({ where: { email: input.email } });
  if (existing) {
    return { ok: false, error: "email_taken" };
  }

  const hashed = await bcrypt.hash(input.password, 12);
  const user = repository.create({
    id: randomUUID(),
    name: input.name,
    email: input.email,
    password: hashed,
    role: input.role,
    isActive: true,
    teamId: input.teamId,
    federationId: input.federationId ?? null,
    leagueId: input.leagueId ?? null,
    tokenVersion: 0,
  });
  const saved = await repository.save(user);

  return { ok: true, user: toIdentityUser(saved) };
}

export async function getUserById(id: string): Promise<IdentityUser | null> {
  const dataSource = await getDataSource();
  const user = await dataSource.getRepository(User).findOne({ where: { id } });
  return user ? toIdentityUser(user) : null;
}

/**
 * TASK-P0-013 (todo.md) : permet à un appelant (ex: federation-hub,
 * acceptInvitation) de vérifier après un `email_taken` sur `createUser` si
 * le compte existant est celui qu'IL vient de créer (retry après un échec
 * réseau/DB survenu APRÈS le succès de la création côté sso, mais AVANT
 * que l'appelant ait pu persister sa propre confirmation) plutôt qu'un
 * conflit avec un compte tiers.
 */
export async function getUserByEmail(email: string): Promise<IdentityUser | null> {
  const dataSource = await getDataSource();
  const user = await dataSource.getRepository(User).findOne({ where: { email } });
  return user ? toIdentityUser(user) : null;
}

export interface UpdateUserInput {
  isActive?: boolean;
  role?: User["role"];
  password?: string;
}

export type UpdateUserResult =
  | { ok: true; user: IdentityUser }
  | { ok: false; error: "not_found" };

/**
 * Un changement de mot de passe ou une désactivation invalide toute
 * session déjà émise pour ce compte (voir User.tokenVersion,
 * identity/src/lib/session.ts) — même principe que resetPassword/changePassword
 * (src/lib/passwordReset.ts), appliqué ici pour un compte géré par un
 * administrateur d'une autre app plutôt que par le titulaire du compte.
 */
export async function updateUser(id: string, input: UpdateUserInput): Promise<UpdateUserResult> {
  const dataSource = await getDataSource();
  const repository = dataSource.getRepository(User);

  const user = await repository.findOne({ where: { id } });
  if (!user) {
    return { ok: false, error: "not_found" };
  }

  let bumpTokenVersion = false;
  // Comparaison par coercition (pas `!==`) : `User.isActive` est un
  // `tinyint` MySQL (0/1) — TypeORM le renvoie déjà en `boolean` sous
  // MySQL réel, mais un driver de test SQLite peut le laisser en `number`
  // (voir src/test/setupSqliteTypes.ts, qui ne réécrit pas `tinyint`). Une
  // égalité stricte entre `true` et `1` serait toujours fausse et
  // déclencherait un bump de tokenVersion inutile à chaque appel, même
  // sans changement réel.
  if (input.isActive !== undefined && Boolean(input.isActive) !== Boolean(user.isActive)) {
    user.isActive = input.isActive;
    bumpTokenVersion = true;
  }
  if (input.role !== undefined) user.role = input.role;
  if (input.password !== undefined) {
    user.password = await bcrypt.hash(input.password, 12);
    bumpTokenVersion = true;
  }
  if (bumpTokenVersion) user.tokenVersion += 1;

  const saved = await repository.save(user);
  return { ok: true, user: toIdentityUser(saved) };
}

export type DeleteUserResult = { ok: true } | { ok: false; error: "not_found" };

export async function deleteUser(id: string): Promise<DeleteUserResult> {
  const dataSource = await getDataSource();
  const repository = dataSource.getRepository(User);
  const user = await repository.findOne({ where: { id } });
  if (!user) {
    return { ok: false, error: "not_found" };
  }
  await repository.remove(user);
  return { ok: true };
}
