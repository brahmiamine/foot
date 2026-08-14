import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { NotificationTargetType } from '../../common/enums/target-type.enum';

/**
 * Cible d'une notification broadcast (§22). USER/TEAM/ROLE/MEMBERS sont
 * résolus par RecipientResolverService via la base partagée (§32 : logique
 * générique uniquement). CATEGORY/SELLER dépendent de données propres à une
 * application métier (catégorie d'âge, statut vendeur) : l'application
 * appelante doit les résoudre elle-même et fournir `userIds` — le
 * Notification API se contente alors de les utiliser tels quels.
 */
export class TargetDto {
  @IsEnum(NotificationTargetType)
  type!: NotificationTargetType;

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  userIds?: string[];
}
