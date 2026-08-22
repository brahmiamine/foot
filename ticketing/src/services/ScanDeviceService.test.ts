import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";

let dataSource: DataSource;

vi.mock("@/lib/database", () => ({ getDataSource: async () => dataSource }));

beforeEach(async () => {
  dataSource = await createTestDataSource();
});
afterEach(async () => dataSource.destroy());

describe("ScanDeviceService — TICK-004", () => {
  it("registers a device and returns a secret that verifies successfully", async () => {
    const { ScanDeviceService } = await import("./ScanDeviceService");
    const service = new ScanDeviceService();
    const { device, secret } = await service.register("club-1", "Scanner entrée principale", "admin-1");

    expect(device.clubId).toBe("club-1");
    expect(device.keyVersion).toBe(1);
    expect(Boolean(device.revoked)).toBe(false);

    const verified = await service.verify(device.id, secret);
    expect(verified?.id).toBe(device.id);
  });

  it("rejects an incorrect secret", async () => {
    const { ScanDeviceService } = await import("./ScanDeviceService");
    const service = new ScanDeviceService();
    const { device } = await service.register("club-1", "Scanner", "admin-1");
    expect(await service.verify(device.id, "wrong-secret")).toBeNull();
  });

  it("a revoked device never verifies again, even with the right secret", async () => {
    const { ScanDeviceService } = await import("./ScanDeviceService");
    const service = new ScanDeviceService();
    const { device, secret } = await service.register("club-1", "Scanner", "admin-1");
    await service.revoke(device.id, "club-1", "admin-2");
    expect(await service.verify(device.id, secret)).toBeNull();
  });

  it("rotating the secret invalidates the previous one immediately and bumps keyVersion", async () => {
    const { ScanDeviceService } = await import("./ScanDeviceService");
    const service = new ScanDeviceService();
    const { device, secret: oldSecret } = await service.register("club-1", "Scanner", "admin-1");
    const { secret: newSecret } = await service.rotateSecret(device.id, "club-1", "admin-1");

    expect(await service.verify(device.id, oldSecret)).toBeNull();
    const verified = await service.verify(device.id, newSecret);
    expect(verified?.keyVersion).toBe(2);
  });

  it("cannot revoke or rotate a device belonging to another club", async () => {
    const { ScanDeviceService } = await import("./ScanDeviceService");
    const service = new ScanDeviceService();
    const { device } = await service.register("club-1", "Scanner", "admin-1");
    await expect(service.revoke(device.id, "club-2", "admin-2")).rejects.toThrow("introuvable");
    await expect(service.rotateSecret(device.id, "club-2", "admin-2")).rejects.toThrow("introuvable");
  });

  it("lists only devices belonging to the requesting club", async () => {
    const { ScanDeviceService } = await import("./ScanDeviceService");
    const service = new ScanDeviceService();
    await service.register("club-1", "Scanner A", "admin-1");
    await service.register("club-2", "Scanner B", "admin-2");
    const list = await service.listForClub("club-1");
    expect(list).toHaveLength(1);
    expect(list[0].label).toBe("Scanner A");
  });

  it("touchLastSync updates the last sync timestamp", async () => {
    const { ScanDeviceService } = await import("./ScanDeviceService");
    const service = new ScanDeviceService();
    const { device } = await service.register("club-1", "Scanner", "admin-1");
    expect(device.lastSyncAt).toBeNull();
    await service.touchLastSync(device.id);
    const list = await service.listForClub("club-1");
    expect(list[0].lastSyncAt).toBeInstanceOf(Date);
  });
});
