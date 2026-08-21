import "reflect-metadata";
import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

/**
 * TICK-004 — appareil scanner enregistré pour le contrôle d'accès hors-ligne
 * (voir src/lib/tickets.ts, getOfflineScanManifest/syncScans). Le secret
 * n'est jamais stocké en clair (`secretHash`, SHA-256) : il n'est renvoyé
 * qu'une fois, à l'enregistrement ou à la rotation (voir ScanDeviceService).
 * `keyVersion` s'incrémente à chaque rotation — un appareil qui présente
 * l'ancien secret est rejeté immédiatement, pas de fenêtre de grâce (à la
 * différence de club-hub/serviceAuth.ts qui, lui, sert une clé de service
 * partagée entre déploiements).
 */
@Entity({ name: "tk_scan_devices" })
export class ScanDevice {
  @PrimaryColumn({ type: "char", length: 36 })
  id!: string;

  @Column({ type: "char", length: 36, name: "club_id" })
  clubId!: string;

  @Column({ type: "varchar", length: 191 })
  label!: string;

  @Column({ type: "char", length: 64, name: "secret_hash" })
  secretHash!: string;

  @Column({ type: "int", name: "key_version", default: 1 })
  keyVersion!: number;

  @Column({ type: "tinyint", default: 0 })
  revoked!: boolean;

  @Column({ type: "datetime", nullable: true, name: "revoked_at" })
  revokedAt!: Date | null;

  @Column({ type: "varchar", length: 191, nullable: true, name: "revoked_by_user_id" })
  revokedByUserId!: string | null;

  @Column({ type: "varchar", length: 191, name: "registered_by_user_id" })
  registeredByUserId!: string;

  @Column({ type: "datetime", nullable: true, name: "last_sync_at" })
  lastSyncAt!: Date | null;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
