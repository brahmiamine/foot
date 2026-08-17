import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AllowedApplications } from '../auth/decorators/allowed-applications.decorator';
import { CurrentSeller } from '../auth/decorators/current-seller.decorator';
import { AllowedApplicationsGuard } from '../auth/guards/allowed-applications.guard';
import { SellerJwtGuard } from '../auth/guards/seller-jwt.guard';
import { ServiceAuthGuard } from '../auth/guards/service-auth.guard';
import type { AuthenticatedSeller } from '../auth/interfaces/authenticated-seller.interface';
import { UpdateSellerCommissionDto } from './dto/update-seller-commission.dto';
import { UpdateSellerProfileDto } from './dto/update-seller-profile.dto';
import { UpdateSellerStatusDto } from './dto/update-seller-status.dto';
import { Seller } from './entities/seller.entity';
import { SellerStatus } from './enums/seller-status.enum';
import { SellersService } from './sellers.service';

@Controller('sellers')
export class SellersController {
  constructor(private readonly sellersService: SellersService) {}

  @Get('me')
  @UseGuards(SellerJwtGuard)
  getMe(@CurrentSeller() seller: AuthenticatedSeller): Promise<Seller> {
    return this.sellersService.findById(seller.sellerId);
  }

  @Patch('me')
  @UseGuards(SellerJwtGuard)
  updateMe(
    @CurrentSeller() seller: AuthenticatedSeller,
    @Body() dto: UpdateSellerProfileDto,
  ): Promise<Seller> {
    return this.sellersService.updateProfile(seller.sellerId, dto);
  }

  @Get()
  @UseGuards(ServiceAuthGuard)
  findAll(
    @Query('clubId') clubId: string,
    @Query('status') status?: SellerStatus,
  ): Promise<Seller[]> {
    return this.sellersService.findAllByClub(clubId, status);
  }

  @Get(':id')
  @UseGuards(ServiceAuthGuard)
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Seller> {
    return this.sellersService.findById(id);
  }

  @Patch(':id/status')
  @UseGuards(ServiceAuthGuard, AllowedApplicationsGuard)
  @AllowedApplications('club-hub', 'federation-hub')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('clubId') clubId: string,
    @Body() dto: UpdateSellerStatusDto,
  ): Promise<Seller> {
    return this.sellersService.updateStatus(id, clubId, dto);
  }

  @Patch(':id/commission')
  @UseGuards(ServiceAuthGuard, AllowedApplicationsGuard)
  @AllowedApplications('club-hub', 'federation-hub')
  updateCommission(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('clubId') clubId: string,
    @Body() dto: UpdateSellerCommissionDto,
  ): Promise<Seller> {
    return this.sellersService.updateCommission(id, clubId, dto.commissionRate);
  }
}
