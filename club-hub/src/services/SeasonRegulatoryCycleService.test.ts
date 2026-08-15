import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { SeasonRegulatoryCycle } from "@/entities/SeasonRegulatoryCycle";

let dataSource: DataSource;

vi.mock("@/lib/database", () => ({ getDataSource: async () => dataSource }));

beforeEach(async () => { dataSource = await createTestDataSource(); });
afterEach(async () => { await dataSource.destroy(); });

describe("SeasonRegulatoryCycleService (club-hub gating)", () => {
  it("treats a season with no cycle as open (legacy behaviour preserved)", async () => {
    const { isClubLicensingWindowOpen, isRegistrationWindowOpen } = await import("./SeasonRegulatoryCycleService");
    expect(await isClubLicensingWindowOpen("season-without-cycle")).toBe(true);
    expect(await isRegistrationWindowOpen("season-without-cycle")).toBe(true);
  });

  it("blocks both windows once the cycle is CLOSED", async () => {
    const { isClubLicensingWindowOpen, isRegistrationWindowOpen } = await import("./SeasonRegulatoryCycleService");
    const repo = dataSource.getRepository(SeasonRegulatoryCycle);
    await repo.save(repo.create({ id: randomUUID(), seasonId: "season-1", federationId: "fed-1", status: "CLOSED", createdBy: "federation-admin" }));
    expect(await isClubLicensingWindowOpen("season-1")).toBe(false);
    expect(await isRegistrationWindowOpen("season-1")).toBe(false);
  });

  it("opens club licensing independently from registrations once dates are set", async () => {
    const { isClubLicensingWindowOpen, isRegistrationWindowOpen } = await import("./SeasonRegulatoryCycleService");
    const repo = dataSource.getRepository(SeasonRegulatoryCycle);
    await repo.save(repo.create({ id: randomUUID(), seasonId: "season-2", federationId: "fed-1", status: "ACTIVE", clubLicensingOpenAt: new Date("2020-01-01"), createdBy: "federation-admin" }));
    expect(await isClubLicensingWindowOpen("season-2")).toBe(true);
    expect(await isRegistrationWindowOpen("season-2")).toBe(false);
  });
});
