import "reflect-metadata";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { MarketplaceNotificationType } from "./marketplaceEnums";

/**
 * Notification vendeur — mappée sur `sp_notifications` (sellerPortal).
 * sellerPortal ne consomme pas encore notification-api (voir avancement.md),
 * donc c'est le seul canal existant pour informer un vendeur d'une décision
 * de modération : on y écrit directement depuis teamManager, comme pour
 * MarketplaceProduct.
 */
@Entity({ name: "sp_notifications" })
export class MarketplaceNotification {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 191 })
  sellerId!: string;

  @Column({ type: "enum", enum: MarketplaceNotificationType })
  type!: MarketplaceNotificationType;

  @Column({ type: "varchar", length: 191 })
  title!: string;

  @Column({ type: "text" })
  message!: string;

  @Column({ type: "boolean", default: false })
  isRead!: boolean;
}
