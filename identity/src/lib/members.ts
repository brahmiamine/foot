import { randomUUID, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { getDataSource } from "./db";
import { User } from "@/entities/User";
import type { SsoUser } from "./session";

const MIN_PASSWORD_LENGTH = 8;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toSsoUser(user: User): SsoUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    teamId: user.teamId ?? null,
    tokenVersion: user.tokenVersion,
  };
}

export type CreateMemberResult =
  | { ok: true; user: SsoUser }
  | { ok: false; error: "invalid" | "email_taken" };

/**
 * Inscription libre d'un membre (espace membre public de `ob`) : rôle
 * MEMBER, pas de club, pas de validation d'un admin — à la différence des
 * comptes ADMIN/OBSERVATEUR/SUPERADMIN qui sont créés à la main.
 */
export async function createMemberAccount(
  name: string,
  email: string,
  password: string,
  profile?: { firstName?: string; lastName?: string; phoneNumber?: string }
): Promise<CreateMemberResult> {
  if (!name.trim() || password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: "invalid" };
  }

  const normalizedEmail = normalizeEmail(email);
  const dataSource = await getDataSource();
  const repository = dataSource.getRepository(User);

  const existing = await repository.findOne({ where: { email: normalizedEmail } });
  if (existing) {
    return { ok: false, error: "email_taken" };
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = repository.create({
    id: randomUUID(),
    name: name.trim(),
    email: normalizedEmail,
    password: hashed,
    role: "MEMBER",
    isActive: true,
    teamId: null,
    firstName: profile?.firstName?.trim() || null,
    lastName: profile?.lastName?.trim() || null,
    phoneNumber: profile?.phoneNumber?.trim() || null,
  });
  await repository.save(user);

  return { ok: true, user: toSsoUser(user) };
}

export interface MemberProfile {
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
}

/**
 * Profil étendu d'un membre — voir User.ts pour pourquoi ces champs
 * existent (Paymee, exigés par ticketing à l'initiation d'un paiement).
 * `null` si le compte n'existe pas ou n'est pas un `MEMBER`.
 */
export async function getMemberProfile(userId: string): Promise<MemberProfile | null> {
  const dataSource = await getDataSource();
  const user = await dataSource.getRepository(User).findOne({ where: { id: userId, role: "MEMBER" } });
  if (!user) return null;

  return {
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    phoneNumber: user.phoneNumber ?? null,
  };
}

/**
 * Met à jour uniquement les champs fournis (undefined = inchangé, chaîne
 * vide = effacé). Restreint aux comptes MEMBER : les comptes staff n'ont
 * aucun usage prévu pour ces champs aujourd'hui.
 */
export async function updateMemberProfile(
  userId: string,
  input: { firstName?: string; lastName?: string; phoneNumber?: string }
): Promise<void> {
  const dataSource = await getDataSource();
  const repository = dataSource.getRepository(User);

  const update: Partial<Pick<User, "firstName" | "lastName" | "phoneNumber">> = {};
  if (input.firstName !== undefined) update.firstName = input.firstName.trim() || null;
  if (input.lastName !== undefined) update.lastName = input.lastName.trim() || null;
  if (input.phoneNumber !== undefined) update.phoneNumber = input.phoneNumber.trim() || null;

  if (Object.keys(update).length === 0) return;
  await repository.update({ id: userId, role: "MEMBER" }, update);
}

export type GoogleMemberResult =
  | { ok: true; user: SsoUser }
  | { ok: false; error: "staff_email" };

/**
 * Connexion/inscription via Google : si l'email existe déjà pour un compte
 * staff (ADMIN/OBSERVATEUR/SUPERADMIN), on refuse — Google ne doit jamais
 * servir à contourner le mot de passe d'un compte interne. Sinon on
 * retrouve ou crée le compte MEMBER correspondant.
 */
export async function findOrCreateGoogleMember(profile: {
  email: string;
  name: string;
}): Promise<GoogleMemberResult> {
  const normalizedEmail = normalizeEmail(profile.email);
  const dataSource = await getDataSource();
  const repository = dataSource.getRepository(User);

  const existing = await repository.findOne({ where: { email: normalizedEmail } });
  if (existing) {
    if (existing.role !== "MEMBER") {
      return { ok: false, error: "staff_email" };
    }
    return { ok: true, user: toSsoUser(existing) };
  }

  // Mot de passe inutilisable : ce compte ne peut être authentifié que via
  // Google (le hash ne correspondra jamais à un mot de passe saisi).
  const unusablePassword = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
  const user = repository.create({
    id: randomUUID(),
    name: profile.name.trim() || normalizedEmail,
    email: normalizedEmail,
    password: unusablePassword,
    role: "MEMBER",
    isActive: true,
    teamId: null,
  });
  await repository.save(user);

  return { ok: true, user: toSsoUser(user) };
}
