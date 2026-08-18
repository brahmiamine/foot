import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { SetLocaleDto } from './dto/set-locale.dto';
import { SetScheduleDto } from './dto/set-schedule.dto';
import { UpsertPreferencesDto } from './dto/upsert-preference.dto';
import { PreferencesService } from './preferences.service';

@Controller('api/preferences')
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Get()
  async findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.preferencesService.findByUser(user.id);
  }

  @Patch()
  async upsertMine(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertPreferencesDto,
  ) {
    return this.preferencesService.upsertMany(user.id, dto.preferences);
  }

  @Get('locale')
  async getLocale(@CurrentUser() user: AuthenticatedUser) {
    return { locale: await this.preferencesService.getLocale(user.id) };
  }

  @Patch('locale')
  async setLocale(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetLocaleDto,
  ) {
    await this.preferencesService.setLocale(user.id, dto.locale);
    return { locale: dto.locale };
  }

  @Get('schedule')
  async getSchedule(@CurrentUser() user: AuthenticatedUser) {
    return this.preferencesService.getSchedule(user.id);
  }

  @Patch('schedule')
  async setSchedule(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetScheduleDto,
  ) {
    return this.preferencesService.setSchedule(user.id, dto);
  }
}
