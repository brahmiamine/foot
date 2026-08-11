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

export interface CreateMemberOptionalFields {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

/**
 * Inscription libre d'un membre (espace membre public de `ob`) : rôle
 * MEMBER, pas de club, pas de validation d'un admin — à la différence des
 * comptes ADMIN/OBSERVATEUR/SUPERADMIN qui sont créés à la main.
 *
 * firstName/lastName/phoneNumber restent optionnels ici à dessein (voir
 * User.ts) : les rendre obligatoires changerait l'UX d'inscription
 * existante, hors périmètre de leur ajout pour Paymee. Un membre qui les
 * saisit pas peut toujours les compléter plus tard sur /membre/profil.
 */
export async function createMemberAccount(
  name: string,
  email: string,
  password: string,
  optional: CreateMemberOptionalFields = {}
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
    firstName: optional.firstName?.trim() || null,
    lastName: optional.lastName?.trim() || null,
    phoneNumber: optional.phoneNumber?.trim() || null,
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
 * Profil "checkout" d'un membre — firstName/lastName/phoneNumber, requis
 * par Paymee (voir payment-api/src/payment/providers/paymee) mais pas par
 * le JWT de session (voir sso/src/lib/session.ts : le payload reste
 * id/email/name/role/teamId/tokenVersion). Exposé via
 * GET /api/members/me/profile pour que `billetterie` puisse le lire au
 * moment de payer, sans que ces champs soient embarqués dans chaque jeton
 * émis ni figés au moment du login si le membre les complète après coup.
 */
export async function getMemberProfile(userId: string): Promise<MemberProfile | null> {
  const dataSource = await getDataSource();
  const user = await dataSource.getRepository(User).findOne({ where: { id: userId } });
  if (!user) return null;
  return {
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    phoneNumber: user.phoneNumber ?? null,
  };
}

/**
 * Mise à jour partielle du profil "checkout" par le membre lui-même
 * (/membre/profil). Une valeur absente du payload laisse le champ
 * inchangé ; une chaîne vide efface le champ (repasse à NULL) plutôt que
 * de stocker une chaîne vide, pour rester cohérent avec la validation
 * "requis et non vide" faite côté billetterie avant d'appeler Paymee.
 */
export async function updateMemberProfile(
  userId: string,
  fields: Partial<CreateMemberOptionalFields>
): Promise<MemberProfile | null> {
  const dataSource = await getDataSource();
  const repository = dataSource.getRepository(User);
  const user = await repository.findOne({ where: { id: userId } });
  if (!user) return null;

  if (fields.firstName !== undefined) user.firstName = fields.firstName.trim() || null;
  if (fields.lastName !== undefined) user.lastName = fields.lastName.trim() || null;
  if (fields.phoneNumber !== undefined) user.phoneNumber = fields.phoneNumber.trim() || null;

  await repository.save(user);

  return {
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    phoneNumber: user.phoneNumber ?? null,
  };
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
