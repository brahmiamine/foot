import crypto from "crypto";
import bcrypt from "bcryptjs";
import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";
import { getDataSource } from "./db";
import { User } from "@/entities/User";
import { MfaEnrollmentChallenge } from "@/entities/MfaEnrollmentChallenge";

const ISSUER = "foot-sso";
const RECOVERY_CODE_COUNT = 10;
const ENROLLMENT_CHALLENGE_TTL_MS = 10 * 60 * 1000; // 10 min

export function generateMfaSecret(): string {
  return generateSecret();
}

export async function buildMfaEnrollment(
  email: string,
  secret: string
): Promise<{ otpauthUri: string; qrCodeDataUrl: string }> {
  const otpauthUri = generateURI({ issuer: ISSUER, label: email, secret });
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri);
  return { otpauthUri, qrCodeDataUrl };
}

export async function verifyTotpCode(secret: string, token: string): Promise<boolean> {
  if (!/^\d{6}$/.test(token)) return false;
  const result = await verify({ secret, token });
  return result.valid;
}

/**
 * Enregistre le secret généré par /api/mfa/setup côté serveur, pour que
 * /api/mfa/enable n'ait plus besoin de le recevoir du client — seul `code`
 * reste requis. Un nouvel appel remplace toute tentative précédente pour
 * cet utilisateur (PK = userId).
 */
export async function createMfaEnrollmentChallenge(userId: string, secret: string): Promise<void> {
  const dataSource = await getDataSource();
  const repo = dataSource.getRepository(MfaEnrollmentChallenge);
  await repo.save(
    repo.create({ userId, secret, expiresAt: new Date(Date.now() + ENROLLMENT_CHALLENGE_TTL_MS) })
  );
}

/**
 * Lit le secret en attente pour cet utilisateur, sans le consommer — un
 * code invalide ne doit pas obliger à rescanner le QR code, l'utilisateur
 * doit pouvoir réessayer jusqu'à expiration. Voir consumeMfaEnrollmentChallenge
 * pour la suppression après succès.
 */
export async function getPendingMfaSecret(userId: string): Promise<string | null> {
  const dataSource = await getDataSource();
  const repo = dataSource.getRepository(MfaEnrollmentChallenge);
  const challenge = await repo.findOne({ where: { userId } });
  if (!challenge || challenge.expiresAt.getTime() < Date.now()) return null;
  return challenge.secret;
}

/** Supprime le challenge après une activation réussie (usage unique). */
export async function consumeMfaEnrollmentChallenge(userId: string): Promise<void> {
  const dataSource = await getDataSource();
  await dataSource.getRepository(MfaEnrollmentChallenge).delete({ userId });
}

export async function isMfaEnabled(userId: string): Promise<boolean> {
  const dataSource = await getDataSource();
  const user = await dataSource.getRepository(User).findOne({ where: { id: userId } });
  return Boolean(user?.mfaEnabled && user.mfaSecret);
}

/** Codes à 10 caractères hex, lisibles et faciles à retaper (ex: a1b2c3d4e5). */
export function generateRecoveryCodes(): string[] {
  return Array.from({ length: RECOVERY_CODE_COUNT }, () => crypto.randomBytes(5).toString("hex"));
}

export async function hashRecoveryCodes(codes: string[]): Promise<string> {
  const hashed = await Promise.all(codes.map((code) => bcrypt.hash(code, 10)));
  return JSON.stringify(hashed);
}

/**
 * Vérifie un code de récupération contre le JSON de hash stocké et retourne
 * le JSON mis à jour (code consommé retiré) si valide — code à usage
 * unique. Ne modifie rien en base elle-même : à l'appelant de sauvegarder
 * `remaining` sur `User.mfaRecoveryCodes`.
 */
export async function consumeRecoveryCode(
  storedJson: string | null | undefined,
  code: string
): Promise<{ valid: boolean; remaining: string | null | undefined }> {
  if (!storedJson) return { valid: false, remaining: storedJson };

  let hashes: string[];
  try {
    hashes = JSON.parse(storedJson);
  } catch {
    return { valid: false, remaining: storedJson };
  }

  for (let i = 0; i < hashes.length; i++) {
    if (await bcrypt.compare(code, hashes[i])) {
      const remaining = [...hashes.slice(0, i), ...hashes.slice(i + 1)];
      return { valid: true, remaining: JSON.stringify(remaining) };
    }
  }
  return { valid: false, remaining: storedJson };
}
