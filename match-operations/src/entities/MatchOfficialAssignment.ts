import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Match } from "./Match";

export type MatchOfficialAssignmentRole =
  | "CENTER_REFEREE"
  | "ASSISTANT_REFEREE"
  | "FOURTH_OFFICIAL"
  | "MATCH_DELEGATE"
  | "REFEREE_OBSERVER"
  | "TEAM_REPRESENTATIVE";

export type MatchOfficialAssignmentStatus = "ACTIVE" | "REVOKED";

/**
 * migration.md §11 (Phase 4) : identité officielle de match — distincte de
 * `ms_match_officials` (saisie libre, nom/licence tapés par le club le
 * jour du match, aucun lien avec un compte réel, voir
 * src/entities/MatchOfficial.ts). Cette table répond au besoin exact du
 * §5.1 : « vérifier qu'un utilisateur est réellement affecté au match
 * concerné », pas juste avoir un rôle REFEREE/MATCH_OFFICIAL/
 * REFEREE_OBSERVER dans son JWT (voir src/middleware.ts).
 *
 * Écrite par federation-hub (fédération/ligue, affectation) via les routes
 * internes /api/internal/matches/:matchId/officials (service-à-service,
 * voir lib/serviceAuth.ts) — jamais directement par match-operations lui-même,
 * qui ne fait ici que CONSOMMER cette table pour autoriser l'accès (voir
 * [matchId]/layout.tsx). Même partage de propriété que `matches.status`
 * (db/OWNERSHIP.md) : une table dans le schéma de match-operations, écrite par
 * un autre service via API interne plutôt que par accès direct à la base.
 *
 * `revokedAt`/`revokedBy` NULL tant que l'affectation est active : jamais
 * de suppression, l'historique des affectations reste consultable
 * (§11 "audit" : auteur, match, action, ancien/nouvel état, date).
 */
@Entity("match_official_assignments")
export class MatchOfficialAssignment {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "char", length: 36, name: "match_id" })
  matchId!: string;

  @ManyToOne(() => Match, { onDelete: "CASCADE" })
  @JoinColumn({ name: "match_id" })
  match?: Match;

  /** `User.id` (sso) de l'officiel affecté — c'est ce compte, authentifié via JWT, qui doit correspondre à la session pour que l'accès soit autorisé. */
  @Column({ type: "varchar", length: 191, name: "user_id" })
  userId!: string;

  /** Référence optionnelle vers le profil arbitre (`arbitres`, arbinote) — traçabilité, jamais utilisée seule pour autoriser un accès. */
  @Column({ type: "varchar", length: 191, nullable: true, name: "referee_id" })
  refereeId?: string | null;

  @Column({
    type: "enum",
    enum: ["CENTER_REFEREE", "ASSISTANT_REFEREE", "FOURTH_OFFICIAL", "MATCH_DELEGATE", "REFEREE_OBSERVER", "TEAM_REPRESENTATIVE"],
  })
  role!: MatchOfficialAssignmentRole;

  @Column({ type: "enum", enum: ["ACTIVE", "REVOKED"], default: "ACTIVE" })
  status!: MatchOfficialAssignmentStatus;

  /** Identité de l'auteur de l'affectation (ex: email FEDERATION_ADMIN/LEAGUE_ADMIN côté federation-hub) — pas de FK vers `User` : l'auteur n'est pas nécessairement un compte match-operations. */
  @Column({ type: "varchar", length: 191, nullable: true, name: "assigned_by" })
  assignedBy?: string | null;

  @CreateDateColumn({ type: "datetime", name: "assigned_at" })
  assignedAt!: Date;

  @Column({ type: "varchar", length: 191, nullable: true, name: "revoked_by" })
  revokedBy?: string | null;

  @Column({ type: "datetime", nullable: true, name: "revoked_at" })
  revokedAt?: Date | null;
}
