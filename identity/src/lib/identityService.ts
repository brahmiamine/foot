import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { getDataSource } from "./db";
import { User } from "@/entities/User";

/**
 * Internal Identity API. Identity is the sole owner of User credentials and
 * account lifecycle; other deployables consume these functions through
 * authenticated service APIs.
 */

export interface IdentityUser {
  id: string;
  name: string;
  email: string;
  role: User["role"];
  isActive: boolean;
  teamId: string | null;
  playerId: string | null;
  federationId: string | null;
  leagueId: string | null;
  createdAt: Date;
}

function toIdentityUser(user: User): IdentityUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: Boolean(user.isActive),
    teamId: user.teamId ?? null,
    playerId: user.playerId ?? null,
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
  playerId?: string | null;
  federationId?: string | null;
  leagueId?: string | null;
}

export type CreateUserResult =
  | { ok: true; user: IdentityUser }
  | { ok: false; error: "email_taken" };

export async function createUser(input: CreateUserInput): Promise<CreateUserResult> {
  const dataSource = await getDataSource();
  const repository = dataSource.getRepository(User);

  const existing = await repository.findOne({ where: { email: input.email } });
  if (existing) return { ok: false, error: "email_taken" };

  const hashed = await bcrypt.hash(input.password, 12);
  const user = repository.create({
    id: randomUUID(),
    name: input.name,
    email: input.email,
    password: hashed,
    role: input.role,
    isActive: true,
    teamId: input.teamId,
    playerId: input.playerId ?? null,
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

export async function getUserByEmail(email: string): Promise<IdentityUser | null> {
  const dataSource = await getDataSource();
  const user = await dataSource.getRepository(User).findOne({ where: { email } });
  return user ? toIdentityUser(user) : null;
}

export interface ListUsersInput {
  teamId?: string;
  roles?: User["role"][];
  hasTeam?: boolean;
}

/**
 * Service-directory read used by federation/admin applications. Filtering is
 * done inside Identity so callers no longer need read access to the User table.
 */
export async function listUsers(input: ListUsersInput = {}): Promise<IdentityUser[]> {
  const dataSource = await getDataSource();
  const query = dataSource.getRepository(User).createQueryBuilder("user");

  if (input.teamId) {
    query.andWhere("user.teamId = :teamId", { teamId: input.teamId });
  }
  if (input.roles?.length) {
    query.andWhere("user.role IN (:...roles)", { roles: input.roles });
  }
  if (input.hasTeam === true) query.andWhere("user.teamId IS NOT NULL");
  if (input.hasTeam === false) query.andWhere("user.teamId IS NULL");

  const users = await query.orderBy("user.name", "ASC").getMany();
  return users.map(toIdentityUser);
}

export interface UpdateUserInput {
  isActive?: boolean;
  role?: User["role"];
  password?: string;
}

export type UpdateUserResult =
  | { ok: true; user: IdentityUser }
  | { ok: false; error: "not_found" };

export async function updateUser(id: string, input: UpdateUserInput): Promise<UpdateUserResult> {
  const dataSource = await getDataSource();
  const repository = dataSource.getRepository(User);

  const user = await repository.findOne({ where: { id } });
  if (!user) return { ok: false, error: "not_found" };

  let bumpTokenVersion = false;
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
  if (!user) return { ok: false, error: "not_found" };
  await repository.remove(user);
  return { ok: true };
}
