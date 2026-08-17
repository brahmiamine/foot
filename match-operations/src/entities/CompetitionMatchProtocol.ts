import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

/**
 * Règles opérationnelles d'une édition de compétition (`saisons.id`).
 * Match Operations reste propriétaire des règles qui conditionnent la
 * feuille électronique ; Federation Hub les configure via l'API interne.
 *
 * Les limites nullable préservent le comportement legacy tant qu'une
 * compétition n'a pas choisi de contrainte explicite.
 */
@Entity("ms_competition_match_protocols")
export class CompetitionMatchProtocol {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, unique: true, name: "season_id" })
  seasonId!: string;

  @Column({ type: "int", nullable: true, name: "pre_match_signing_deadline_minutes" })
  preMatchSigningDeadlineMinutes?: number | null;

  @Column({ type: "int", nullable: true, name: "max_bench_players" })
  maxBenchPlayers?: number | null;

  @Column({ type: "int", nullable: true, name: "max_substitutions" })
  maxSubstitutions?: number | null;

  @Column({ type: "tinyint", default: 1, name: "require_home_signature" })
  requireHomeSignature!: boolean;

  @Column({ type: "tinyint", default: 1, name: "require_away_signature" })
  requireAwaySignature!: boolean;

  @Column({ type: "tinyint", default: 1, name: "require_referee_signature" })
  requireRefereeSignature!: boolean;

  @Column({ type: "tinyint", default: 0, name: "require_center_referee" })
  requireCenterReferee!: boolean;

  @Column({ type: "int", default: 0, name: "required_assistant_referees" })
  requiredAssistantReferees!: number;

  @Column({ type: "tinyint", default: 0, name: "require_fourth_official" })
  requireFourthOfficial!: boolean;

  @Column({ type: "tinyint", default: 0, name: "require_match_delegate" })
  requireMatchDelegate!: boolean;

  @Column({ type: "tinyint", default: 0, name: "require_referee_observer" })
  requireRefereeObserver!: boolean;

  /** Fenêtre après signature/clôture pendant laquelle un amendement peut être demandé. NULL = pas de limite. */
  @Column({ type: "int", nullable: true, name: "post_signature_correction_window_minutes" })
  postSignatureCorrectionWindowMinutes?: number | null;

  /** Si vrai, une demande d'amendement reste bloquée jusqu'à décision Fédération. */
  @Column({ type: "tinyint", default: 0, name: "post_signature_federation_approval_required" })
  postSignatureFederationApprovalRequired!: boolean;

  @Column({ type: "int", default: 1 })
  version!: number;

  @Column({ type: "varchar", length: 191, nullable: true, name: "updated_by" })
  updatedBy?: string | null;

  @UpdateDateColumn({ type: "datetime", name: "updated_at" })
  updatedAt!: Date;
}
