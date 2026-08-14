import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Training } from "./Training";
import { TacticsBoard } from "./TacticsBoard";

export type TrainingBlockType = "WARMUP" | "TECHNIQUE" | "SMALL_SIDED_GAME" | "TACTICS" | "MATCH" | "PHYSICAL" | "RECOVERY" | "OTHER";

/**
 * TrainingBlock Entity — bloc chronométré composant le déroulé d'une séance
 * (ex: Échauffement 15', Technique 20', Jeu réduit 25', Tactique 20',
 * Match 20'). `tacticsBoardId` permet d'importer un exercice préparé sur
 * une planche tactique (cms_tactics_boards) directement dans ce bloc.
 */
@Entity("cms_training_blocks")
export class TrainingBlock {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "bigint", name: "training_id" })
  trainingId!: number;

  @ManyToOne(() => Training, { onDelete: "CASCADE" })
  @JoinColumn({ name: "training_id" })
  training!: Training;

  @Column({ type: "int", default: 0, name: "display_order" })
  displayOrder!: number;

  @Column({
    type: "enum",
    enum: ["WARMUP", "TECHNIQUE", "SMALL_SIDED_GAME", "TACTICS", "MATCH", "PHYSICAL", "RECOVERY", "OTHER"],
    default: "OTHER",
    name: "block_type",
  })
  blockType!: TrainingBlockType;

  @Column({ type: "varchar", length: 200 })
  label!: string;

  @Column({ type: "int", default: 15, name: "duration_minutes" })
  durationMinutes!: number;

  @Column({ type: "varchar", length: 500, nullable: true })
  notes?: string | null;

  @Column({ type: "bigint", nullable: true, name: "tactics_board_id" })
  tacticsBoardId?: number | null;

  @ManyToOne(() => TacticsBoard, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "tactics_board_id" })
  tacticsBoard?: TacticsBoard | null;
}
