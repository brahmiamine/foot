import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { UpsertNotificationPolicyDto } from '../policy/dto/upsert-notification-policy.dto';
import { PolicyService } from '../policy/policy.service';

/**
 * Administration de la NotificationPolicy organisationnelle (NOTIF-001).
 * PLATFORM est réservée SUPERADMIN ; CLUB dérive systématiquement `scopeId`
 * du `teamId` de l'acteur côté serveur (jamais du corps de la requête), pour
 * qu'un ADMIN club ne puisse jamais configurer un autre club.
 */
@Controller('admin/notification-policies')
@UseGuards(RolesGuard)
export class AdminNotificationPoliciesController {
  constructor(private readonly policyService: PolicyService) {}

  @Get()
  @Roles('SUPERADMIN', 'ADMIN')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.policyService
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

  /**
   * GOV-006 : expose la policy réellement appliquée et la provenance de
   * chaque canal. Un ADMIN est toujours borné à son propre club ; seul un
   * SUPERADMIN peut demander explicitement un autre teamId.
   */
  @Get('effective')
  @Roles('SUPERADMIN', 'ADMIN')
  async resolveEffective(
    @CurrentUser() user: AuthenticatedUser,
    @Query('category') category?: string,
    @Query('teamId') requestedTeamId?: string | null,
    @Query('at') rawAt?: string,
  ) {
    if (user.role !== 'SUPERADMIN' && !user.teamId) {
      throw new ForbiddenException(
        'Actor has no club to resolve a CLUB notification policy for',
      );
    }

    const teamId =
      user.role === 'SUPERADMIN'
        ? requestedTeamId?.trim() || null
        : user.teamId;
    const at = rawAt ? new Date(rawAt) : new Date();
    if (Number.isNaN(at.getTime())) {
      throw new BadRequestException('Invalid effective policy resolution date');
    }

    // Une catégorie absente force volontairement le fallback vers les
    // policies joker `category IS NULL` sans introduire un nouveau scope.
    const effectiveCategory = category?.trim() || '__WILDCARD__';
    return this.policyService.resolveExplained(teamId, effectiveCategory, at);
  }

  @Post('platform')
  @Roles('SUPERADMIN')
  async upsertPlatform(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertNotificationPolicyDto,
    @Req() req: Request,
  ) {
    return this.policyService.upsert({
      scopeType: 'PLATFORM',
      scopeId: null,
      category: dto.category ?? null,
      channels: dto.channels,
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
      effectiveUntil: dto.effectiveUntil ? new Date(dto.effectiveUntil) : null,
      actorUserId: user.id,
      actorRole: user.role,
      reason: dto.reason,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
  }

  @Post('club')
  @Roles('SUPERADMIN', 'ADMIN')
  async upsertClub(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertNotificationPolicyDto,
    @Req() req: Request,
  ) {
    if (!user.teamId) {
      throw new ForbiddenException(
        'Actor has no club to configure a CLUB notification policy for',
      );
    }
    return this.policyService.upsert({
      scopeType: 'CLUB',
      scopeId: user.teamId,
      category: dto.category ?? null,
      channels: dto.channels,
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
      effectiveUntil: dto.effectiveUntil ? new Date(dto.effectiveUntil) : null,
      actorUserId: user.id,
      actorRole: user.role,
      reason: dto.reason,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
  }
}
