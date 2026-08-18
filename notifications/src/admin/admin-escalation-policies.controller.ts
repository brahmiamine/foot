import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { UpsertEscalationPolicyDto } from '../escalation/dto/upsert-escalation-policy.dto';
import { EscalationPolicyService } from '../escalation/escalation-policy.service';

/** Administration de la policy d'escalade (NOTIF-004) — même règle de portée que NOTIF-001. */
@Controller('admin/notification-escalation-policies')
@UseGuards(RolesGuard)
export class AdminEscalationPoliciesController {
  constructor(
    private readonly escalationPolicyService: EscalationPolicyService,
  ) {}

  @Get()
  @Roles('SUPERADMIN', 'ADMIN')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.escalationPolicyService
      .findAll()
      .then((policies) =>
        user.role === 'SUPERADMIN'
          ? policies
          : policies.filter(
              (policy) =>
                policy.scopeType === 'PLATFORM' ||
                policy.scopeId === user.teamId,
            ),
      );
  }

  @Post('platform')
  @Roles('SUPERADMIN')
  upsertPlatform(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertEscalationPolicyDto,
    @Req() req: Request,
  ) {
    return this.escalationPolicyService.upsert({
      scopeType: 'PLATFORM',
      scopeId: null,
      category: dto.category ?? null,
      enabled: dto.enabled,
      delayMinutes: dto.delayMinutes,
      backupUserId: dto.backupUserId ?? null,
      backupRole: dto.backupRole ?? null,
      actorUserId: user.id,
      actorRole: user.role,
      reason: dto.reason,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
  }

  @Post('club')
  @Roles('SUPERADMIN', 'ADMIN')
  upsertClub(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertEscalationPolicyDto,
    @Req() req: Request,
  ) {
    if (!user.teamId) {
      throw new ForbiddenException(
        'Actor has no club to configure a CLUB escalation policy for',
      );
    }
    return this.escalationPolicyService.upsert({
      scopeType: 'CLUB',
      scopeId: user.teamId,
      category: dto.category ?? null,
      enabled: dto.enabled,
      delayMinutes: dto.delayMinutes,
      backupUserId: dto.backupUserId ?? null,
      backupRole: dto.backupRole ?? null,
      actorUserId: user.id,
      actorRole: user.role,
      reason: dto.reason,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
  }
}
