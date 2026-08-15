import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { DataSource } from "typeorm";
import { createTestDataSource } from "@/test/testDataSource";
import { ClubSanction } from "@/lib/entities/ClubSanction";
import { hasActiveCompetitionBan } from "./clubSanctions";

let dataSource: DataSource;

beforeEach(async () => { dataSource = await createTestDataSource(); });
afterEach(async () => { await dataSource.destroy(); });

/**
 * Régression migration-v2 P0-006/P0-009 : `transitionCompetitionRegistration`
 * lisait auparavant une table `regulatory_bans` supprimée lors de la fusion
 * avec P0-009 (voir migration-v2.md, "Bilan de cette migration"), ce qui
 * aurait fait échouer toute approbation d'engagement sur une base créée avec
 * le manifeste de migrations actuel. `hasActiveCompetitionBan` (source unique
 * : `club_sanctions`) est maintenant le seul lecteur — ces tests exercent le
 * vrai schéma SQL (pas juste la logique pure) pour éviter une régression
 * silencieuse similaire. `transitionCompetitionRegistration` lui-même utilise
 * `.setLock('pessimistic_write')`, non supporté par le driver sqlite de test
 * (voir clubSanctions.ts) : cette fonction ne peut donc pas être exercée
 * directement ici, d'où le test au niveau du helper qu'elle appelle.
 */
describe("hasActiveCompetitionBan (P0-006/P0-009)", () => {
  it("finds an active COMPETITION_BAN scoped to the season", async () => {
    const clubId = randomUUID(); const federationId = randomUUID(); const seasonId = randomUUID();
    const repo = dataSource.getRepository(ClubSanction);
    await repo.save(repo.create({ clubId, federationId, seasonId, type: "COMPETITION_BAN", reason: "Dettes impayées", startsAt: new Date("2026-01-01"), status: "ACTIVE", createdBy: "federation-admin" }));
    const ban = await hasActiveCompetitionBan(dataSource, clubId, seasonId);
    expect(ban).not.toBeNull();
    expect(ban?.type).toBe("COMPETITION_BAN");
  });

  it("finds an active COMPETITION_EXCLUSION with no season scope (applies to every season)", async () => {
    const clubId = randomUUID(); const federationId = randomUUID();
    const repo = dataSource.getRepository(ClubSanction);
    await repo.save(repo.create({ clubId, federationId, seasonId: null, type: "COMPETITION_EXCLUSION", reason: "Exclusion", startsAt: new Date("2026-01-01"), status: "ACTIVE", createdBy: "federation-admin" }));
    const ban = await hasActiveCompetitionBan(dataSource, clubId, randomUUID());
    expect(ban).not.toBeNull();
  });

  it("ignores a ban scoped to a different season", async () => {
    const clubId = randomUUID(); const federationId = randomUUID();
    const repo = dataSource.getRepository(ClubSanction);
    await repo.save(repo.create({ clubId, federationId, seasonId: randomUUID(), type: "COMPETITION_BAN", reason: "Dettes impayées", startsAt: new Date("2026-01-01"), status: "ACTIVE", createdBy: "federation-admin" }));
    const ban = await hasActiveCompetitionBan(dataSource, clubId, randomUUID());
    expect(ban).toBeNull();
  });

  it("ignores sanctions that are not COMPETITION_BAN/COMPETITION_EXCLUSION (e.g. TRANSFER_BAN, FINE)", async () => {
    const clubId = randomUUID(); const federationId = randomUUID(); const seasonId = randomUUID();
    const repo = dataSource.getRepository(ClubSanction);
    await repo.save(repo.create({ clubId, federationId, seasonId, type: "TRANSFER_BAN", reason: "Interdiction de recrutement", startsAt: new Date("2026-01-01"), status: "ACTIVE", createdBy: "federation-admin" }));
    await repo.save(repo.create({ clubId, federationId, seasonId, type: "FINE", reason: "Amende", startsAt: new Date("2026-01-01"), status: "ACTIVE", createdBy: "federation-admin", amountDue: "1000" }));
    const ban = await hasActiveCompetitionBan(dataSource, clubId, seasonId);
    expect(ban).toBeNull();
  });

  it("ignores a COMPETITION_BAN that is LIFTED", async () => {
    const clubId = randomUUID(); const federationId = randomUUID(); const seasonId = randomUUID();
    const repo = dataSource.getRepository(ClubSanction);
    await repo.save(repo.create({ clubId, federationId, seasonId, type: "COMPETITION_BAN", reason: "Dettes impayées", startsAt: new Date("2026-01-01"), status: "LIFTED", createdBy: "federation-admin", liftedAt: new Date(), liftedBy: "federation-admin", liftReason: "Réglé" }));
    const ban = await hasActiveCompetitionBan(dataSource, clubId, seasonId);
    expect(ban).toBeNull();
  });
});
