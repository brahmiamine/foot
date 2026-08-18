import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export type PublicContentScopeType = "PLATFORM" | "CLUB";

/** OB-004 : sections publiques activables (pages hébergées par club-ob). */
export type PublicSectionKey =
  | "NEWS"
  | "ANNOUNCEMENTS"
  | "GALLERY"
  | "SHOP"
  | "CALENDAR"
  | "COMMUNITY"
  | "PARTNERS"
  | "RECRUITMENT"
  | "FORMATION"
  | "SELLER_ONBOARDING";

export const PUBLIC_SECTION_KEYS: PublicSectionKey[] = [
  "NEWS",
  "ANNOUNCEMENTS",
  "GALLERY",
  "SHOP",
  "CALENDAR",
  "COMMUNITY",
  "PARTNERS",
  "RECRUITMENT",
  "FORMATION",
  "SELLER_ONBOARDING",
];

export type BannerSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface EmergencyBanner {
  enabled: boolean;
  messageFr: string | null;
  messageAr: string | null;
  severity: BannerSeverity;
}

/**
 * Policy versionnée (GOV-001 `resolvePolicy`) : PLATFORM (`scopeId` NULL)
 * fixe le défaut, CLUB (`scopeId` = teamId) peut surcharger. La
 * "programmation de publication" (OB-004) est portée nativement par
 * `effectiveFrom`/`effectiveUntil` de `resolvePolicy` — une nouvelle
 * version prend effet à une date future sans mécanisme dédié.
 */
@Entity("cms_public_content_policies")
@Index(["scopeType", "scopeId"])
export class PublicContentPolicy {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "enum", enum: ["PLATFORM", "CLUB"], name: "scope_type" })
  scopeType!: PublicContentScopeType;

  @Column({ type: "char", length: 36, nullable: true, name: "scope_id" })
  scopeId!: string | null;

  @Column({ type: "int" })
  version!: number;

  @Column({ type: "datetime", nullable: true, name: "effective_from" })
  effectiveFrom!: Date | null;

  @Column({ type: "datetime", nullable: true, name: "effective_until" })
  effectiveUntil!: Date | null;

  @Column({ type: "json", nullable: true })
  sections!: Partial<Record<PublicSectionKey, boolean>> | null;

  @Column({ type: "json", nullable: true, name: "emergency_banner" })
  emergencyBanner!: Partial<EmergencyBanner> | null;

  @Column({ type: "varchar", length: 191, name: "updated_by" })
  updatedBy!: string;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}
