import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

/**
 * TASK-P0-014 : journal des réouvertures déjà traitées, pour rendre
 * `SheetService.reopen()` idempotent vis-à-vis d'un appelant qui rejoue la
 * même requête (retry réseau après un timeout côté superadmin, voir
 * superadmin/src/lib/matchsheetClient.ts#reopenSheet). `idempotencyKey` est
 * fourni par l'appelant (superadmin génère une clé une fois par action
 * utilisateur et la réutilise sur ses propres retries) — un rejeu avec la
 * même clé pour le même match renvoie l'état déjà obtenu sans ré-exécuter
 * la transition ni ses effets de bord (mirroring sur `matches`).
 */
@Entity({ name: "ms_match_reopen_log" })
@Unique(["matchId", "idempotencyKey"])
export class MatchReopenLog {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "match_id" })
  matchId!: string;

  @Column({ type: "varchar", length: 191, name: "idempotency_key" })
  idempotencyKey!: string;

  @Column({ type: "bigint", name: "sheet_id" })
  sheetId!: number;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
