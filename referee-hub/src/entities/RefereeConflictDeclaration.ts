import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

/**
 * REF-005 — déclaration de conflit d'intérêts d'un officiel sur une
 * désignation, obligatoire avant acceptation. Append-only : une nouvelle
 * déclaration remplace la précédente pour la même désignation, l'historique
 * complet reste dans `RefereeConfigurationAudit`.
 */
@Entity("referee_conflict_declarations")
@Index(["assignmentId", "userId"], { unique: true })
export class RefereeConflictDeclaration {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "bigint", name: "assignment_id" })
  assignmentId!: number;

  @Column({ type: "varchar", length: 191, name: "user_id" })
  userId!: string;

  @Column({ type: "tinyint", name: "has_conflict" })
  hasConflict!: boolean;

  @Column({ type: "varchar", length: 500, nullable: true })
  details!: string | null;

  @Column({ type: "datetime", name: "declared_at" })
  declaredAt!: Date;

  @CreateDateColumn({ type: "datetime", name: "created_at" })
  createdAt!: Date;
}
