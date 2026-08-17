import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { NotificationTargetType } from '../common/enums/target-type.enum';
import { SharedDirectoryService } from '../database/shared-directory.service';
import { CreateInternalNotificationDto } from '../internal/dto/create-internal-notification.dto';

export interface ResolvedRecipients { userIds: string[]; teamId: string | null }

@Injectable()
export class RecipientResolverService {
  constructor(private readonly directory: SharedDirectoryService) {}

  async resolve(dto: CreateInternalNotificationDto): Promise<ResolvedRecipients> {
    const modes = [Boolean(dto.userId), Boolean(dto.target), Boolean(dto.email)].filter(Boolean).length;
    if (modes !== 1) throw new BadRequestException('Provide exactly one of userId, target or email');
    if (dto.email) {
      const normalized = dto.email.trim().toLowerCase();
      const digest = createHash('sha256').update(normalized).digest('hex');
      return { userIds: [`external-email:${digest}`], teamId: dto.teamId ?? null };
    }
    if (dto.userId) return { userIds: [dto.userId], teamId: dto.teamId ?? null };

    const target = dto.target!;
    switch (target.type) {
      case NotificationTargetType.USER:
        if (!target.userIds?.length) throw new BadRequestException('target.userIds is required for target.type=USER');
        return { userIds: target.userIds, teamId: dto.teamId ?? target.teamId ?? null };
      case NotificationTargetType.TEAM:
        if (!target.teamId) throw new BadRequestException('target.teamId is required for target.type=TEAM');
        this.requireDirectory();
        return { userIds: await this.directory.findActiveUserIdsByTeam(target.teamId), teamId: target.teamId };
      case NotificationTargetType.ROLE:
        if (!target.role) throw new BadRequestException('target.role is required for target.type=ROLE');
        this.requireDirectory();
        return { userIds: await this.directory.findActiveUserIdsByRole(target.role, target.teamId), teamId: target.teamId ?? dto.teamId ?? null };
      case NotificationTargetType.MEMBERS:
        this.requireDirectory();
        return { userIds: await this.directory.findActiveUserIdsByRole('MEMBER', target.teamId), teamId: target.teamId ?? null };
      case NotificationTargetType.CATEGORY:
      case NotificationTargetType.SELLER:
        if (!target.userIds?.length) throw new BadRequestException(`target.userIds is required for target.type=${target.type}`);
        return { userIds: target.userIds, teamId: dto.teamId ?? target.teamId ?? null };
      default:
        throw new BadRequestException(`Unsupported target.type: ${String(target.type)}`);
    }
  }

  private requireDirectory(): void {
    if (!this.directory.isEnabled()) throw new BadRequestException('This target type requires DIRECTORY_DB_HOST to be configured');
  }
}
