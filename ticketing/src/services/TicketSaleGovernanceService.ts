import { createHash } from "node:crypto";
import { In, LessThanOrEqual, MoreThan } from "typeorm";
import { getDataSource } from "@/lib/database";
import { Match } from "@/entities/Match";
import { MatchTicketCategory } from "@/entities/MatchTicketCategory";
import { TicketSaleRule, type TicketSaleStatus } from "@/entities/TicketSaleRule";
import { TicketingGovernanceSettings } from "@/entities/TicketingGovernance";

const SETTINGS_DEFAULTS = {
  saleApprovalRequired: true,
  makerCheckerEnabled: true,
  priceReapprovalRequired: true,
} as const;

export interface TicketingGovernanceSettingsValue {
  clubId: string;
  saleApprovalRequired: boolean;
  makerCheckerEnabled: boolean;
  priceReapprovalRequired: boolean;
  version: number;
  updatedBy: string | null;
  updatedAt: Date | null;
}

export interface SaleConfigurationInput {
  allowedAudience?: "PUBLIC" | "HOME_SUPPORTERS" | "AWAY_SUPPORTERS";
  audienceValidationMode?: "STRICT" | "DECLARATIVE";
  maxTicketsPerUser?: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
  presaleRequiresMembership?: boolean;
  presaleMembershipCodes?: string[] | null;
  presaleEndsAt?: Date | null;
}

const PROTECTED_STATUSES: TicketSaleStatus[] = ["APPROVED", "SCHEDULED", "OPEN", "PAUSED"];

function stableHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function assertPrice(price: string): void {
  const parsed = Number(price);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error("Le prix doit être un nombre positif ou nul");
}

function validateConfig(input: SaleConfigurationInput): void {
  if (input.maxTicketsPerUser !== undefined && (!Number.isInteger(input.maxTicketsPerUser) || input.maxTicketsPerUser <= 0)) {
    throw new Error("maxTicketsPerUser doit être un entier strictement positif");
  }
  if (input.startsAt && input.endsAt && input.startsAt.getTime() >= input.endsAt.getTime()) {
    throw new Error("La date de fin doit être postérieure à la date de début");
  }
  if (input.presaleMembershipCodes) {
    const valid = ["FAN", "SOCIO", "VIP", "SUPPORTER", "PARTNER"];
    for (const code of input.presaleMembershipCodes) {
      if (!valid.includes(code)) throw new Error(`Code de membership invalide : ${code}`);
    }
  }
}

export class TicketSaleGovernanceService {
  async getSettings(clubId: string): Promise<TicketingGovernanceSettingsValue> {
    const ds = await getDataSource();
    const row = await ds.getRepository(TicketingGovernanceSettings).findOne({ where: { clubId } });
    if (!row) return { clubId, ...SETTINGS_DEFAULTS, version: 0, updatedBy: null, updatedAt: null };
    return {
      clubId,
      saleApprovalRequired: Boolean(row.saleApprovalRequired),
      makerCheckerEnabled: Boolean(row.makerCheckerEnabled),
      priceReapprovalRequired: Boolean(row.priceReapprovalRequired),
      version: row.version,
      updatedBy: row.updatedBy ?? null,
      updatedAt: row.updatedAt ?? null,
    };
  }

  async updateSettings(
    clubId: string,
    actorUserId: string,
    input: Partial<Pick<TicketingGovernanceSettingsValue, "saleApprovalRequired" | "makerCheckerEnabled" | "priceReapprovalRequired">>,
  ): Promise<TicketingGovernanceSettingsValue> {
    const raw = input as Record<string, unknown>;
    const safe = {
      ...(Object.prototype.hasOwnProperty.call(raw, "saleApprovalRequired")
        ? { saleApprovalRequired: raw.saleApprovalRequired }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(raw, "makerCheckerEnabled")
        ? { makerCheckerEnabled: raw.makerCheckerEnabled }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(raw, "priceReapprovalRequired")
        ? { priceReapprovalRequired: raw.priceReapprovalRequired }
        : {}),
    } as Partial<TicketingGovernanceSettingsValue>;
    for (const [field, value] of Object.entries(safe)) {
      if (typeof value !== "boolean") throw new Error(`${field} doit être un booléen`);
    }

    const ds = await getDataSource();
    await ds.transaction(async (manager) => {
      const repo = manager.getRepository(TicketingGovernanceSettings);
      const current = await repo.findOne({ where: { clubId } });
      const row = current ?? repo.create({ clubId, ...SETTINGS_DEFAULTS, version: 1 });
      Object.assign(row, safe);
      row.version = current ? current.version + 1 : 1;
      row.updatedBy = actorUserId;
      await repo.save(row);
    });
    return this.getSettings(clubId);
  }

  private async resolveOwnedCategory(matchTicketCategoryId: string, clubId: string) {
    const ds = await getDataSource();
    const category = await ds.getRepository(MatchTicketCategory).findOne({ where: { id: matchTicketCategoryId } });
    if (!category) throw new Error("Offre de billetterie introuvable");
    const match = await ds.getRepository(Match).findOne({ where: { id: category.matchId } });
    if (!match) throw new Error("Match introuvable");
    if (match.equipeHome !== clubId) throw new Error("Cette offre n'appartient pas à votre club");
    return { category, match };
  }

  private async fingerprint(matchTicketCategoryId: string): Promise<string> {
    const ds = await getDataSource();
    const category = await ds.getRepository(MatchTicketCategory).findOne({ where: { id: matchTicketCategoryId } });
    if (!category) throw new Error("Offre de billetterie introuvable");
    const rule = await ds.getRepository(TicketSaleRule).findOne({ where: { matchTicketCategoryId } });
    if (!rule) throw new Error("Règle de vente introuvable");
    return stableHash({
      price: category.price,
      capacity: category.capacity,
      allowedAudience: rule.allowedAudience,
      audienceValidationMode: rule.audienceValidationMode,
      maxTicketsPerUser: rule.maxTicketsPerUser,
      startsAt: rule.startsAt?.toISOString() ?? null,
      endsAt: rule.endsAt?.toISOString() ?? null,
      presaleRequiresMembership: rule.presaleRequiresMembership,
      presaleMembershipCodes: rule.presaleMembershipCodes ?? null,
      presaleEndsAt: rule.presaleEndsAt?.toISOString() ?? null,
    });
  }

  private statusAfterApproval(rule: TicketSaleRule, now: Date): TicketSaleStatus {
    if (rule.endsAt && rule.endsAt.getTime() <= now.getTime()) return "CLOSED";
    if (rule.startsAt && rule.startsAt.getTime() > now.getTime()) return "SCHEDULED";
    return "OPEN";
  }

  async getOrCreateRule(matchTicketCategoryId: string, clubId: string): Promise<TicketSaleRule> {
    await this.resolveOwnedCategory(matchTicketCategoryId, clubId);
    const ds = await getDataSource();
    const repo = ds.getRepository(TicketSaleRule);
    const existing = await repo.findOne({ where: { matchTicketCategoryId } });
    if (existing) return existing;
    return repo.save(
      repo.create({
        matchTicketCategoryId,
        allowedAudience: "PUBLIC",
        audienceValidationMode: "DECLARATIVE",
        maxTicketsPerUser: 4,
        startsAt: null,
        endsAt: null,
        presaleRequiresMembership: false,
        presaleMembershipCodes: null,
        presaleEndsAt: null,
        status: "DRAFT",
        approvedFingerprint: null,
        submittedBy: null,
        submittedAt: null,
        approvedBy: null,
        approvedAt: null,
        rejectionReason: null,
        version: 1,
      }),
    );
  }

  async updateConfiguration(
    matchTicketCategoryId: string,
    clubId: string,
    input: SaleConfigurationInput,
  ): Promise<TicketSaleRule> {
    await this.resolveOwnedCategory(matchTicketCategoryId, clubId);
    validateConfig(input);
    const ds = await getDataSource();
    const repo = ds.getRepository(TicketSaleRule);
    const rule = await this.getOrCreateRule(matchTicketCategoryId, clubId);
    const beforeFingerprint = PROTECTED_STATUSES.includes(rule.status) ? await this.fingerprint(matchTicketCategoryId) : null;

    if (input.allowedAudience !== undefined) rule.allowedAudience = input.allowedAudience;
    if (input.audienceValidationMode !== undefined) rule.audienceValidationMode = input.audienceValidationMode;
    if (input.maxTicketsPerUser !== undefined) rule.maxTicketsPerUser = input.maxTicketsPerUser;
    if (input.startsAt !== undefined) rule.startsAt = input.startsAt;
    if (input.endsAt !== undefined) rule.endsAt = input.endsAt;
    if (input.presaleRequiresMembership !== undefined) rule.presaleRequiresMembership = input.presaleRequiresMembership;
    if (input.presaleMembershipCodes !== undefined) rule.presaleMembershipCodes = input.presaleMembershipCodes;
    if (input.presaleEndsAt !== undefined) rule.presaleEndsAt = input.presaleEndsAt;
    rule.version += 1;
    await repo.save(rule);

    if (beforeFingerprint && beforeFingerprint !== (await this.fingerprint(matchTicketCategoryId))) {
      rule.status = "READY_FOR_REVIEW";
      rule.approvedFingerprint = null;
      rule.approvedBy = null;
      rule.approvedAt = null;
      rule.rejectionReason = null;
      await repo.save(rule);
    }
    return rule;
  }

  async updatePrice(matchTicketCategoryId: string, clubId: string, price: string): Promise<MatchTicketCategory> {
    assertPrice(price);
    const { category } = await this.resolveOwnedCategory(matchTicketCategoryId, clubId);
    if (category.price === price) return category;

    const ds = await getDataSource();
    const settings = await this.getSettings(clubId);
    const rule = await ds.getRepository(TicketSaleRule).findOne({ where: { matchTicketCategoryId } });
    category.price = Number(price).toFixed(3);
    await ds.getRepository(MatchTicketCategory).save(category);

    if (rule && settings.priceReapprovalRequired && PROTECTED_STATUSES.includes(rule.status)) {
      rule.status = "READY_FOR_REVIEW";
      rule.approvedFingerprint = null;
      rule.approvedBy = null;
      rule.approvedAt = null;
      rule.rejectionReason = null;
      rule.version += 1;
      await ds.getRepository(TicketSaleRule).save(rule);
    }
    return category;
  }

  async submit(matchTicketCategoryId: string, clubId: string, actorUserId: string, now = new Date()): Promise<TicketSaleRule> {
    const rule = await this.getOrCreateRule(matchTicketCategoryId, clubId);
    if (!["DRAFT", "REJECTED", "READY_FOR_REVIEW"].includes(rule.status)) {
      throw new Error(`La vente au statut ${rule.status} ne peut pas être soumise`);
    }
    const settings = await this.getSettings(clubId);
    const ds = await getDataSource();
    rule.submittedBy = actorUserId;
    rule.submittedAt = now;
    rule.rejectionReason = null;
    rule.version += 1;

    if (settings.saleApprovalRequired) {
      rule.status = "READY_FOR_REVIEW";
      rule.approvedFingerprint = null;
      rule.approvedBy = null;
      rule.approvedAt = null;
    } else {
      rule.approvedFingerprint = await this.fingerprint(matchTicketCategoryId);
      rule.approvedBy = actorUserId;
      rule.approvedAt = now;
      rule.status = this.statusAfterApproval(rule, now);
    }
    return ds.getRepository(TicketSaleRule).save(rule);
  }

  async approve(matchTicketCategoryId: string, clubId: string, actorUserId: string, now = new Date()): Promise<TicketSaleRule> {
    await this.resolveOwnedCategory(matchTicketCategoryId, clubId);
    const ds = await getDataSource();
    const repo = ds.getRepository(TicketSaleRule);
    const rule = await repo.findOne({ where: { matchTicketCategoryId } });
    if (!rule || rule.status !== "READY_FOR_REVIEW") throw new Error("Aucune vente n'attend d'approbation");
    const settings = await this.getSettings(clubId);
    if (settings.makerCheckerEnabled && rule.submittedBy === actorUserId) {
      throw new Error("Le créateur ne peut pas approuver sa propre vente");
    }
    rule.approvedFingerprint = await this.fingerprint(matchTicketCategoryId);
    rule.approvedBy = actorUserId;
    rule.approvedAt = now;
    rule.rejectionReason = null;
    rule.status = this.statusAfterApproval(rule, now);
    rule.version += 1;
    return repo.save(rule);
  }

  async reject(matchTicketCategoryId: string, clubId: string, actorUserId: string, reason: string): Promise<TicketSaleRule> {
    await this.resolveOwnedCategory(matchTicketCategoryId, clubId);
    const normalized = reason.trim();
    if (normalized.length < 5) throw new Error("Un motif de rejet est obligatoire");
    const ds = await getDataSource();
    const repo = ds.getRepository(TicketSaleRule);
    const rule = await repo.findOne({ where: { matchTicketCategoryId } });
    if (!rule || rule.status !== "READY_FOR_REVIEW") throw new Error("Aucune vente n'attend de décision");
    const settings = await this.getSettings(clubId);
    if (settings.makerCheckerEnabled && rule.submittedBy === actorUserId) {
      throw new Error("Le créateur ne peut pas rejeter sa propre vente");
    }
    rule.status = "REJECTED";
    rule.rejectionReason = normalized;
    rule.approvedFingerprint = null;
    rule.approvedBy = null;
    rule.approvedAt = null;
    rule.version += 1;
    return repo.save(rule);
  }

  async pause(matchTicketCategoryId: string, clubId: string): Promise<TicketSaleRule> {
    await this.resolveOwnedCategory(matchTicketCategoryId, clubId);
    const ds = await getDataSource();
    const repo = ds.getRepository(TicketSaleRule);
    const rule = await repo.findOne({ where: { matchTicketCategoryId } });
    if (!rule || !["OPEN", "SCHEDULED"].includes(rule.status)) throw new Error("Cette vente ne peut pas être mise en pause");
    rule.status = "PAUSED";
    rule.version += 1;
    return repo.save(rule);
  }

  async resume(matchTicketCategoryId: string, clubId: string, now = new Date()): Promise<TicketSaleRule> {
    await this.resolveOwnedCategory(matchTicketCategoryId, clubId);
    const ds = await getDataSource();
    const repo = ds.getRepository(TicketSaleRule);
    const rule = await repo.findOne({ where: { matchTicketCategoryId } });
    if (!rule || rule.status !== "PAUSED") throw new Error("Cette vente n'est pas en pause");
    if (rule.approvedFingerprint && rule.approvedFingerprint !== (await this.fingerprint(matchTicketCategoryId))) {
      rule.status = "READY_FOR_REVIEW";
      rule.approvedFingerprint = null;
    } else {
      rule.status = this.statusAfterApproval(rule, now);
    }
    rule.version += 1;
    return repo.save(rule);
  }

  async close(matchTicketCategoryId: string, clubId: string): Promise<TicketSaleRule> {
    await this.resolveOwnedCategory(matchTicketCategoryId, clubId);
    const ds = await getDataSource();
    const repo = ds.getRepository(TicketSaleRule);
    const rule = await repo.findOne({ where: { matchTicketCategoryId } });
    if (!rule) throw new Error("Règle de vente introuvable");
    rule.status = "CLOSED";
    rule.version += 1;
    return repo.save(rule);
  }

  async processDue(now = new Date()): Promise<{ opened: number; closed: number }> {
    const ds = await getDataSource();
    const repo = ds.getRepository(TicketSaleRule);
    const scheduled = await repo.find({ where: { status: "SCHEDULED", startsAt: LessThanOrEqual(now) } });
    let opened = 0;
    for (const rule of scheduled) {
      if (rule.endsAt && rule.endsAt.getTime() <= now.getTime()) {
        rule.status = "CLOSED";
      } else {
        rule.status = "OPEN";
        opened += 1;
      }
      rule.version += 1;
      await repo.save(rule);
    }
    const expired = await repo.find({ where: { status: "OPEN", endsAt: LessThanOrEqual(now) } });
    for (const rule of expired) {
      rule.status = "CLOSED";
      rule.version += 1;
      await repo.save(rule);
    }
    return { opened, closed: expired.length + scheduled.filter((rule) => rule.status === "CLOSED").length };
  }

  async assertPurchasable(matchTicketCategoryId: string, now = new Date()): Promise<TicketSaleRule> {
    const ds = await getDataSource();
    const rule = await ds.getRepository(TicketSaleRule).findOne({ where: { matchTicketCategoryId } });
    if (!rule) throw new Error("La vente n'est pas ouverte pour cette catégorie");
    if (rule.status !== "OPEN") throw new Error(`La vente n'est pas ouverte (statut ${rule.status})`);
    if (rule.startsAt && now.getTime() < rule.startsAt.getTime()) throw new Error("La vente n'a pas encore commencé");
    if (rule.endsAt && now.getTime() > rule.endsAt.getTime()) throw new Error("La vente est terminée");
    if (rule.approvedFingerprint && rule.approvedFingerprint !== (await this.fingerprint(matchTicketCategoryId))) {
      throw new Error("Le prix ou les paramètres ont changé depuis l'approbation");
    }
    return rule;
  }
}
