import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * `actorId` est l'identifiant du compte staff club ayant déclenché l'action
 * (ex: User.id côté teamManager) — jamais déduit de la clé de service, qui
 * n'identifie que l'application appelante, pas l'utilisateur derrière.
 */
export class ModerationActionDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(191)
  actorId: string;
}
