import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { AllowedApplications } from '../auth/decorators/allowed-applications.decorator';
import { AllowedApplicationsGuard } from '../auth/guards/allowed-applications.guard';
import { ServiceAuthGuard } from '../auth/guards/service-auth.guard';
import { UpdateMarketplaceSettingsDto } from './dto/update-marketplace-settings.dto';
import { SellersService } from './sellers.service';

@Controller('marketplace-settings')
@UseGuards(ServiceAuthGuard, AllowedApplicationsGuard)
export class MarketplaceSettingsController {
  constructor(private readonly sellersService: SellersService) {}
  @Get() @AllowedApplications('club-ob', 'club-hub', 'federation-hub', 'seller-portal') get(@Query('clubId') clubId: string) { return this.sellersService.getClubSettings(clubId); }
  @Patch() @AllowedApplications('club-hub', 'federation-hub') update(@Query('clubId') clubId: string, @Body() dto: UpdateMarketplaceSettingsDto) { return this.sellersService.updateClubSettings(clubId, dto); }
}
