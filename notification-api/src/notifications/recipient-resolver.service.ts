import { BadRequestException, Injectable } from '@nestjs/common';
import { SharedDirectoryService } from '../database/shared-directory.service';
import { NotificationTargetType } from '../common/enums/target-type.enum';
import { CreateInternalNotificationDto } from '../internal/dto/create-internal-notification.dto';

export interface ResolvedRecipients {
  userIds: string[];
  teamId: string | null;
}

/**
 * Traduit un payload /internal/notifications (destinataire unique ou cible
 * broadcast, §22) en liste concrète de `userId`. USER/TEAM/ROLE/MEMBERS sont
 * résolus génériquement via la base partagée `foot` (aucune connaissance
 * football/marketplace, §32). CATEGORY/SELLER n'ont pas d'équivalent
 * générique : l'application appelante doit fournir `target.userIds`
 * pré-résolus.
 */
@Injectable()
export class RecipientResolverService {
  constructor(private readonly directory: SharedDirectoryService) {}

  async resolve(
    dto: CreateInternalNotificationDto,
  ): Promise<ResolvedRecipients> {
    if (dto.userId && dto.target) {
      throw new BadRequestException(
        'Provide either userId or target, not both',
      );
    }

    if (dto.userId) {
      return { userIds: [dto.userId], teamId: dto.teamId ?? null };
    }

    if (!dto.target) {
      throw new BadRequestException('Either userId or target is required');
    }

    const { target } = dto;
    switch (target.type) {
      case NotificationTargetType.USER: {
        if (!target.userIds?.length) {
          throw new BadRequestException(
            'target.userIds is required for target.type=USER',
          );
        }
        return {
          userIds: target.userIds,
          teamId: dto.teamId ?? target.teamId ?? null,
        };
      }
      case NotificationTargetType.TEAM: {
        if (!target.teamId) {
          throw new BadRequestException(
            'target.teamId is required for target.type=TEAM',
          );
        }
        this.requireDirectory();
        const userIds = await this.directory.findActiveUserIdsByTeam(
          target.teamId,
        );
        return { userIds, teamId: target.teamId };
      }
      case NotificationTargetType.ROLE: {
        if (!target.role) {
          throw new BadRequestException(
            'target.role is required for target.type=ROLE',
          );
        }
        this.requireDirectory();
        const userIds = await this.directory.findActiveUserIdsByRole(
          target.role,
          target.teamId,
        );
        return { userIds, teamId: target.teamId ?? dto.teamId ?? null };
      }
      case NotificationTargetType.MEMBERS: {
        this.requireDirectory();
        const userIds = await this.directory.findActiveUserIdsByRole(
          'MEMBER',
          target.teamId,
        );
        return { userIds, teamId: target.teamId ?? null };
      }
      case NotificationTargetType.CATEGORY:
      case NotificationTargetType.SELLER: {
        if (!target.userIds?.length) {
          throw new BadRequestException(
            `target.userIds is required for target.type=${target.type} (must be pre-resolved by the calling application, see §32)`,
          );
        }
        return {
          userIds: target.userIds,
          teamId: dto.teamId ?? target.teamId ?? null,
        };
      }
      default:
        throw new BadRequestException(
          `Unsupported target.type: ${String(target.type)}`,
        );
    }
  }

  private requireDirectory(): void {
    if (!this.directory.isEnabled()) {
      throw new BadRequestException(
        'This target type requires DIRECTORY_DB_HOST to be configured',
      );
    }
  }
}
