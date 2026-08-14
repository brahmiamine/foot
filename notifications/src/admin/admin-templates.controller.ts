import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { NotificationChannelType } from '../common/enums/channel.enum';
import { NotificationLocale } from '../common/enums/locale.enum';
import { TemplatesService } from '../templates/templates.service';
import { UpsertTemplateDto } from './dto/upsert-template.dto';

/** Administration des templates (§14) : consultation et édition, réservées à SUPERADMIN. */
@Controller('admin/templates')
@UseGuards(RolesGuard)
@Roles('SUPERADMIN')
export class AdminTemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  findAll() {
    return this.templatesService.findAll();
  }

  @Put(':type/:channel/:locale')
  upsert(
    @Param('type') type: string,
    @Param('channel', new ParseEnumPipe(NotificationChannelType))
    channel: NotificationChannelType,
    @Param('locale', new ParseEnumPipe(NotificationLocale))
    locale: NotificationLocale,
    @Body() dto: UpsertTemplateDto,
  ) {
    return this.templatesService.upsert(type, channel, locale, dto);
  }
}
