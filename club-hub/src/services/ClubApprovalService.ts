import { createHash } from "node:crypto";
import type { EntityManager } from "typeorm";
import { getDataSource } from "@/lib/database";
import { News } from "@/entities/News";
import { NewsMedia } from "@/entities/NewsMedia";
import { Announcement } from "@/entities/Announcement";
import { Product } from "@/entities/Product";
import {
  ClubApprovalDecision,
  ClubApprovalRequest,
  ClubGovernanceSettings,
  type ClubApprovalDomain,
  type ClubApprovalMode,
} from "@/entities/ClubGovernance";
import { NotificationOutboxService } from "@/services/NotificationOutboxService";
import {
  registerApproval,
  type ApprovalPolicy,
  type ApprovalState,
} from "../../../packages/domain-contracts/src/approval";

const DEFAULTS = {
  makerCheckerEnabled: true,
  newsApprovalMode: "SINGLE_APPROVAL" as ClubApprovalMode,
  newsReapprovalOnSensitiveChange: true,
  announcementDefaultApprovalMode: "SINGLE_APPROVAL" as ClubApprovalMode,
  announcementDecisionApprovalMode: "DUAL_APPROVAL" as ClubApprovalMode,
  announcementSanctionApprovalMode: "DUAL_APPROVAL" as ClubApprovalMode,
  announcementReapprovalOnSensitiveChange: true,
  shopProductApprovalMode: "SINGLE_APPROVAL" as ClubApprovalMode,
  shopProductReapprovalOnSensitiveChange: true,
};

export type ClubGovernanceSettingsValue = typeof DEFAULTS & {
  teamId: string;
  version: number;
  updatedBy: string | null;
  updatedAt: Date | null;
};

export interface PublicationSubmissionResult {
  published: boolean;
  request: ClubApprovalRequest | null;
  message: string;
}

function stableHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function requiredApprovals(mode: ClubApprovalMode): number {
  return mode === "DUAL_APPROVAL" ? 2 : mode === "SINGLE_APPROVAL" ? 1 : 0;
}

export class ClubApprovalService {
  async getSettings(teamId: string): Promise<ClubGovernanceSettingsValue> {
    const ds = await getDataSource();
    return this.getSettingsWithManager(ds.manager, teamId);
  }

  private async getSettingsWithManager(
    manager: EntityManager,
    teamId: string,
  ): Promise<ClubGovernanceSettingsValue> {
    const row = await manager.getRepository(ClubGovernanceSettings).findOne({ where: { teamId } });
    if (!row) {
      return {
        teamId,
        ...DEFAULTS,
        version: 0,
        updatedBy: null,
        updatedAt: null,
      };
    }
    return {
      teamId,
      makerCheckerEnabled: Boolean(row.makerCheckerEnabled),
      newsApprovalMode: row.newsApprovalMode,
      newsReapprovalOnSensitiveChange: Boolean(row.newsReapprovalOnSensitiveChange),
      announcementDefaultApprovalMode: row.announcementDefaultApprovalMode,
      announcementDecisionApprovalMode: row.announcementDecisionApprovalMode,
      announcementSanctionApprovalMode: row.announcementSanctionApprovalMode,
      announcementReapprovalOnSensitiveChange: Boolean(row.announcementReapprovalOnSensitiveChange),
      shopProductApprovalMode: row.shopProductApprovalMode,
      shopProductReapprovalOnSensitiveChange: Boolean(row.shopProductReapprovalOnSensitiveChange),
      version: row.version,
      updatedBy: row.updatedBy ?? null,
      updatedAt: row.updatedAt,
    };
  }

  async updateSettings(
    teamId: string,
    actorUserId: string,
    values: Partial<Omit<ClubGovernanceSettingsValue, "teamId" | "version" | "updatedBy" | "updatedAt">>,
  ): Promise<ClubGovernanceSettingsValue> {
    const ds = await getDataSource();
    await ds.transaction(async (manager) => {
      const repo = manager.getRepository(ClubGovernanceSettings);
      const current = await repo.findOne({ where: { teamId } });
      const row = current ?? repo.create({ teamId, ...DEFAULTS, version: 1 });
      Object.assign(row, values);
      row.version = current ? current.version + 1 : 1;
      row.updatedBy = actorUserId;
      await repo.save(row);
    });
    return this.getSettings(teamId);
  }

  async listPending(teamId: string): Promise<ClubApprovalRequest[]> {
    const ds = await getDataSource();
    return ds.getRepository(ClubApprovalRequest).find({
      where: { teamId, status: "PENDING" },
      order: { createdAt: "ASC" },
    });
  }

  async getRequest(requestId: string, teamId: string): Promise<ClubApprovalRequest | null> {
    const ds = await getDataSource();
    return ds.getRepository(ClubApprovalRequest).findOne({ where: { id: requestId, teamId } });
  }

  async submitPublication(
    domain: ClubApprovalDomain,
    entityId: string,
    teamId: string,
    makerUserId: string,
  ): Promise<PublicationSubmissionResult> {
    const ds = await getDataSource();
    return ds.transaction((manager) =>
      this.submitPublicationWithManager(manager, domain, entityId, teamId, makerUserId),
    );
  }

  private async submitPublicationWithManager(
    manager: EntityManager,
    domain: ClubApprovalDomain,
    entityId: string,
    teamId: string,
    makerUserId: string,
  ): Promise<PublicationSubmissionResult> {
    const settings = await this.getSettingsWithManager(manager, teamId);
    const fingerprint = await this.currentFingerprint(manager, domain, entityId, teamId);
    const mode = await this.modeFor(manager, domain, entityId, teamId, settings);

    if (mode === "AUTO") {
      await this.publishEntity(manager, domain, entityId, teamId);
      return { published: true, request: null, message: "Publication effectuée automatiquement" };
    }

    const requestRepo = manager.getRepository(ClubApprovalRequest);
    const active = await requestRepo.find({
      where: { teamId, domain, entityId, status: "PENDING" },
      order: { createdAt: "DESC" },
    });
    const reusable = active.find(
      (request) => request.contentFingerprint === fingerprint && request.makerUserId === makerUserId,
    );
    if (reusable) {
      return { published: false, request: reusable, message: "Demande déjà en attente d'approbation" };
    }
    for (const request of active) {
      request.status = "CANCELLED";
      request.resolvedAt = new Date();
      await requestRepo.save(request);
    }

    const request = await requestRepo.save(
      requestRepo.create({
        teamId,
        domain,
        entityId,
        action: "PUBLISH",
        makerUserId,
        makerCheckerEnabled: settings.makerCheckerEnabled,
        approvalMode: mode,
        requiredApprovals: requiredApprovals(mode),
        contentFingerprint: fingerprint,
        status: "PENDING",
        rejectionReason: null,
        resolvedAt: null,
      }),
    );
    return {
      published: false,
      request,
      message:
        mode === "DUAL_APPROVAL"
          ? "Publication soumise à une double approbation"
          : "Publication soumise à approbation",
    };
  }

  async approve(requestId: string, teamId: string, actorUserId: string): Promise<ClubApprovalRequest> {
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const requestRepo = manager.getRepository(ClubApprovalRequest);
      const request = await requestRepo
        .createQueryBuilder("request")
        .setLock("pessimistic_write")
        .where("request.id = :requestId AND request.teamId = :teamId", { requestId, teamId })
        .getOne();
      if (!request || request.status !== "PENDING") {
        throw new Error("Demande d'approbation introuvable ou déjà résolue");
      }

      const currentFingerprint = await this.currentFingerprint(
        manager,
        request.domain,
        request.entityId,
        request.teamId,
      );
      if (currentFingerprint !== request.contentFingerprint) {
        request.status = "CANCELLED";
        request.resolvedAt = new Date();
        await requestRepo.save(request);
        throw new Error("Le contenu a changé depuis la demande : une nouvelle approbation est requise");
      }

      const decisionRepo = manager.getRepository(ClubApprovalDecision);
      const decisions = await decisionRepo.find({ where: { requestId: request.id, decision: "APPROVE" } });
      const policy: ApprovalPolicy = {
        mode: request.approvalMode,
        makerCheckerEnabled: Boolean(request.makerCheckerEnabled),
      };
      const state: ApprovalState = {
        makerUserId: request.makerUserId,
        approverUserIds: decisions.map((decision) => decision.actorUserId),
      };
      const registered = registerApproval(policy, state, actorUserId);

      await decisionRepo.save(
        decisionRepo.create({
          requestId: request.id,
          actorUserId,
          decision: "APPROVE",
          reason: null,
        }),
      );

      if (registered.evaluation.canFinalize) {
        await this.publishEntity(manager, request.domain, request.entityId, request.teamId);
        request.status = "APPROVED";
        request.resolvedAt = new Date();
        await requestRepo.save(request);
      }
      return request;
    });
  }

  async reject(
    requestId: string,
    teamId: string,
    actorUserId: string,
    reason: string,
  ): Promise<ClubApprovalRequest> {
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 3) throw new Error("Un motif de rejet est obligatoire");
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const requestRepo = manager.getRepository(ClubApprovalRequest);
      const request = await requestRepo
        .createQueryBuilder("request")
        .setLock("pessimistic_write")
        .where("request.id = :requestId AND request.teamId = :teamId", { requestId, teamId })
        .getOne();
      if (!request || request.status !== "PENDING") {
        throw new Error("Demande d'approbation introuvable ou déjà résolue");
      }
      if (request.makerCheckerEnabled && request.makerUserId === actorUserId) {
        throw new Error("Le créateur ne peut pas rejeter sa propre demande en mode maker/checker");
      }

      await manager.getRepository(ClubApprovalDecision).save(
        manager.getRepository(ClubApprovalDecision).create({
          requestId: request.id,
          actorUserId,
          decision: "REJECT",
          reason: normalizedReason,
        }),
      );
      request.status = "REJECTED";
      request.rejectionReason = normalizedReason;
      request.resolvedAt = new Date();
      return requestRepo.save(request);
    });
  }

  async requireReapprovalAfterSensitiveEdit(
    domain: ClubApprovalDomain,
    entityId: string,
    teamId: string,
    makerUserId: string,
  ): Promise<PublicationSubmissionResult | null> {
    const ds = await getDataSource();
    return ds.transaction(async (manager) => {
      const settings = await this.getSettingsWithManager(manager, teamId);
      const enabled =
        domain === "NEWS"
          ? settings.newsReapprovalOnSensitiveChange
          : domain === "ANNOUNCEMENT"
            ? settings.announcementReapprovalOnSensitiveChange
            : settings.shopProductReapprovalOnSensitiveChange;
      if (!enabled) return null;

      const mode = await this.modeFor(manager, domain, entityId, teamId, settings);
      if (mode === "AUTO") return null;
      await this.unpublishEntity(manager, domain, entityId, teamId);
      return this.submitPublicationWithManager(manager, domain, entityId, teamId, makerUserId);
    });
  }

  private async modeFor(
    manager: EntityManager,
    domain: ClubApprovalDomain,
    entityId: string,
    teamId: string,
    settings: ClubGovernanceSettingsValue,
  ): Promise<ClubApprovalMode> {
    if (domain === "NEWS") return settings.newsApprovalMode;
    if (domain === "CLUB_PRODUCT") return settings.shopProductApprovalMode;

    const announcement = await manager.getRepository(Announcement).findOne({
      where: { id: Number(entityId), teamId },
    });
    if (!announcement) throw new Error("Communiqué introuvable");
    if (announcement.category === "DECISION") return settings.announcementDecisionApprovalMode;
    if (announcement.category === "SANCTION") return settings.announcementSanctionApprovalMode;
    return settings.announcementDefaultApprovalMode;
  }

  private async currentFingerprint(
    manager: EntityManager,
    domain: ClubApprovalDomain,
    entityId: string,
    teamId: string,
  ): Promise<string> {
    if (domain === "NEWS") {
      const newsId = Number(entityId);
      const item = await manager.getRepository(News).findOne({ where: { id: newsId, teamId } });
      if (!item) throw new Error("Actualité introuvable");
      const media = await manager.getRepository(NewsMedia).find({
        where: { newsId },
        order: { displayOrder: "ASC" },
      });
      return stableHash({
        title: item.title,
        contentHtml: item.contentHtml,
        coverImage: item.coverImage,
        media: media.map(({ mediaItemId, displayOrder }) => ({ mediaItemId, displayOrder })),
      });
    }
    if (domain === "ANNOUNCEMENT") {
      const item = await manager.getRepository(Announcement).findOne({ where: { id: Number(entityId), teamId } });
      if (!item) throw new Error("Communiqué introuvable");
      return stableHash({ title: item.title, contentHtml: item.contentHtml, category: item.category });
    }
    const item = await manager.getRepository(Product).findOne({ where: { id: Number(entityId), teamId } });
    if (!item) throw new Error("Produit introuvable");
    return stableHash({
      categoryId: item.categoryId,
      nameFr: item.nameFr,
      nameAr: item.nameAr,
      descriptionFr: item.descriptionFr,
      descriptionAr: item.descriptionAr,
      price: item.price,
      imageUrl: item.imageUrl,
    });
  }

  private async publishEntity(
    manager: EntityManager,
    domain: ClubApprovalDomain,
    entityId: string,
    teamId: string,
  ): Promise<void> {
    if (domain === "NEWS") {
      const repo = manager.getRepository(News);
      const item = await repo.findOne({ where: { id: Number(entityId), teamId } });
      if (!item) throw new Error("Actualité introuvable");
      const newlyPublished = item.status !== "PUBLISHED" || !item.isPublished;
      item.status = "PUBLISHED";
      item.isPublished = true;
      item.publishedAt = new Date();
      await repo.save(item);
      if (newlyPublished) {
        await new NotificationOutboxService().enqueue(manager, {
          eventId: `news-published:${item.id}`,
          type: "NEWS_PUBLISHED",
          target: { type: "MEMBERS", teamId },
          teamId,
          category: "NEWS_PUBLISHED",
          title: "Nouvelle actualité",
          body: item.title,
          data: { newsId: item.id, newsTitle: item.title },
        });
      }
      return;
    }
    if (domain === "ANNOUNCEMENT") {
      const repo = manager.getRepository(Announcement);
      const item = await repo.findOne({ where: { id: Number(entityId), teamId } });
      if (!item) throw new Error("Communiqué introuvable");
      item.isPublished = true;
      item.publishedAt = new Date();
      await repo.save(item);
      return;
    }
    const repo = manager.getRepository(Product);
    const item = await repo.findOne({ where: { id: Number(entityId), teamId } });
    if (!item) throw new Error("Produit introuvable");
    item.isActive = true;
    await repo.save(item);
  }

  private async unpublishEntity(
    manager: EntityManager,
    domain: ClubApprovalDomain,
    entityId: string,
    teamId: string,
  ): Promise<void> {
    if (domain === "NEWS") {
      const repo = manager.getRepository(News);
      const item = await repo.findOne({ where: { id: Number(entityId), teamId } });
      if (!item) throw new Error("Actualité introuvable");
      item.status = "DRAFT";
      item.isPublished = false;
      item.publishedAt = null;
      await repo.save(item);
      return;
    }
    if (domain === "ANNOUNCEMENT") {
      const repo = manager.getRepository(Announcement);
      const item = await repo.findOne({ where: { id: Number(entityId), teamId } });
      if (!item) throw new Error("Communiqué introuvable");
      item.isPublished = false;
      item.publishedAt = null;
      await repo.save(item);
      return;
    }
    const repo = manager.getRepository(Product);
    const item = await repo.findOne({ where: { id: Number(entityId), teamId } });
    if (!item) throw new Error("Produit introuvable");
    item.isActive = false;
    await repo.save(item);
  }
}
