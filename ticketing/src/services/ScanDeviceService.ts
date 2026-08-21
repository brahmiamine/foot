import { randomBytes, randomUUID, createHash } from "node:crypto";
import { getDataSource } from "@/lib/database";
import { ScanDevice } from "@/entities/ScanDevice";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

function generateSecret(): string {
  return randomBytes(32).toString("hex");
}

/**
 * TICK-004 — registre des appareils scanner : révocation, version de clé,
 * dernière synchronisation. Le secret n'est jamais lu en clair après sa
 * génération (`register`/`rotateSecret`) — seul son SHA-256 est persisté
 * (`ScanDevice.secretHash`), vérifié à chaque appel `verify`.
 */
export class ScanDeviceService {
  async register(clubId: string, label: string, actorUserId: string): Promise<{ device: ScanDevice; secret: string }> {
    const trimmed = label.trim();
    if (!trimmed) throw new ForbiddenError("Le libellé de l'appareil est obligatoire");
    const secret = generateSecret();
    const ds = await getDataSource();
    const repo = ds.getRepository(ScanDevice);
    const device = await repo.save(
      repo.create({
        id: randomUUID(),
        clubId,
        label: trimmed,
        secretHash: hashSecret(secret),
        keyVersion: 1,
        revoked: false,
        registeredByUserId: actorUserId,
      }),
    );
    return { device, secret };
  }

  async rotateSecret(deviceId: string, clubId: string, actorUserId: string): Promise<{ device: ScanDevice; secret: string }> {
    void actorUserId;
    const ds = await getDataSource();
    const repo = ds.getRepository(ScanDevice);
    const device = await repo.findOne({ where: { id: deviceId, clubId } });
    if (!device) throw new NotFoundError("Appareil introuvable");
    if (device.revoked) throw new ForbiddenError("Cet appareil est révoqué");
    const secret = generateSecret();
    device.secretHash = hashSecret(secret);
    device.keyVersion += 1;
    await repo.save(device);
    return { device, secret };
  }

  async revoke(deviceId: string, clubId: string, actorUserId: string): Promise<ScanDevice> {
    const ds = await getDataSource();
    const repo = ds.getRepository(ScanDevice);
    const device = await repo.findOne({ where: { id: deviceId, clubId } });
    if (!device) throw new NotFoundError("Appareil introuvable");
    if (device.revoked) throw new ForbiddenError("Cet appareil est déjà révoqué");
    device.revoked = true;
    device.revokedAt = new Date();
    device.revokedByUserId = actorUserId;
    return repo.save(device);
  }

  async listForClub(clubId: string): Promise<ScanDevice[]> {
    const ds = await getDataSource();
    return ds.getRepository(ScanDevice).find({ where: { clubId }, order: { createdAt: "DESC" } });
  }

  /** Vérifie un couple (deviceId, secret) : `null` si inconnu, révoqué, ou secret incorrect. */
  async verify(deviceId: string, secret: string): Promise<ScanDevice | null> {
    const ds = await getDataSource();
    const device = await ds.getRepository(ScanDevice).findOne({ where: { id: deviceId } });
    if (!device || device.revoked) return null;
    if (device.secretHash !== hashSecret(secret)) return null;
    return device;
  }

  async touchLastSync(deviceId: string): Promise<void> {
    const ds = await getDataSource();
    await ds.getRepository(ScanDevice).update({ id: deviceId }, { lastSyncAt: new Date() });
  }
}
