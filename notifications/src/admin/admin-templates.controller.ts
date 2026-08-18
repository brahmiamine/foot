import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { NotificationChannelType } from '../common/enums/channel.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { NotificationLocale } from '../common/enums/locale.enum';
import { TemplateStatus } from '../common/enums/template-status.enum';
import { TemplatesService } from '../templates/templates.service';
import { TransitionTemplateDto } from './dto/transition-template.dto';
import { UpsertTemplateDto } from './dto/upsert-template.dto';

/**
 * Administration des templates (§14, NOTIF-005) : consultation et workflow
 * DRAFT→SUBMITTED→APPROVED→ACTIVE→ARCHIVED, réservés SUPERADMIN.
 */
@Controller('admin/templates')
@UseGuards(RolesGuard)
@Roles('SUPERADMIN')
export class AdminTemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  findAll(@Query('status') status?: TemplateStatus) {
    return this.templatesService.findAll(status);
  }

  @Post(':type/:channel/:locale')
  createDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Param('type') type: string,
    @Param('channel', new ParseEnumPipe(NotificationChannelType))
    channel: NotificationChannelType,
    @Param('locale', new ParseEnumPipe(NotificationLocale))
    locale: NotificationLocale,
    @Body() dto: UpsertTemplateDto,
  ) {
    return this.templatesService.createDraft(
      type,
      channel,
      locale,
      dto,
      user.id,
    );
  }

  @Post(':id/submit')
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.templatesService.submit(id, user.id);
  }

  @Post(':id/request-changes')
  requestChanges(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionTemplateDto,
    @Req() req: Request,
  ) {
    return this.templatesService.requestChanges(
      id,
      this.toActor(user, dto, req),
    );
  }

  @Post(':id/approve')
  approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionTemplateDto,
    @Req() req: Request,
  ) {
    return this.templatesService.approve(id, this.toActor(user, dto, req));
  }

  @Post(':id/activate')
  activate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionTemplateDto,
    @Req() req: Request,
  ) {
    return this.templatesService.activate(id, this.toActor(user, dto, req));
  }

  @Post(':id/archive')
  archive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionTemplateDto,
    @Req() req: Request,
  ) {
    return this.templatesService.archive(id, this.toActor(user, dto, req));
  }

  private toActor(
    user: AuthenticatedUser,
    dto: TransitionTemplateDto,
    req: Request,
  ) {
    return {
      userId: user.id,
      role: user.role,
      reason: dto.reason,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    };
  }
}
