import { Controller, Get, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminStatsService } from './admin-stats.service';

@Controller('admin/stats')
@UseGuards(RolesGuard)
@Roles('SUPERADMIN')
export class AdminStatsController {
  constructor(private readonly statsService: AdminStatsService) {}

  @Get()
  getStats() {
    return this.statsService.getStats();
  }
}
