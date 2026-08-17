import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { NotificationTargetType } from '../common/enums/target-type.enum';
import { SharedDirectoryService } from '../database/shared-directory.service';
import { CreateInternalNotificationDto } from '../internal/dto/create-internal-notification.dto';

export interface ResolvedRecipients {
  userIds: string[];
  teamId: string | null;
}

@Injectable()
export class RecipientResolverService {
  constructor(private readonly directory: SharedDirectoryService) {}

  async resolve(
    dto: CreateInternalNotificationDto,
  ): Promise<ResolvedRecipients> {
    const recipientModes = [
      Boolean(dto.userId),
      Boolean(dto.target),
      Boolean(dto.email),
    ].filter(Boolean).length;

    if (recipientModes !== 1) {
      throw new BadRequestException(
        'Provide exactly one of userId, target or email',
      );
    }

    if (dto.email) {
      const normalizedEmail = dto.email.trim().toLowerCase();
      const digest = createHash('sha256').update(normalizedEmail).digest('hex');
      return {
        userIds: [`external-email:${digest}`],
        teamId: dto.teamId ?? null,
      };
    }

    if (dto.userId) {
      return { userIds: [dto.userId], teamId: dto.teamId ?? null };
    }

    const { target } = dto;
    if (!target) {
      throw new BadRequestException('A notification target is required');
    }

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
