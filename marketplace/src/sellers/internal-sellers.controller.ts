import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ServiceAuthGuard } from '../auth/guards/service-auth.guard';
import { AllowedApplicationsGuard } from '../auth/guards/allowed-applications.guard';
import { AllowedApplications } from '../auth/decorators/allowed-applications.decorator';
import { SellersService } from './sellers.service';
import { UpdateSellerProfileDto } from './dto/update-seller-profile.dto';
import { Seller } from './entities/seller.entity';

@Controller('internal/sellers')
@UseGuards(ServiceAuthGuard, AllowedApplicationsGuard)
@AllowedApplications('seller-portal')
export class InternalSellersController {
  constructor(private readonly sellersService: SellersService) {}

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Seller> {
    return this.sellersService.findById(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSellerProfileDto,
  ): Promise<Seller> {
    return this.sellersService.updateProfile(id, dto);
  }
}
