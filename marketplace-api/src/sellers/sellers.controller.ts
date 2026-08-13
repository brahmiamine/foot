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
import { SellerJwtGuard } from '../auth/guards/seller-jwt.guard';
import { ServiceAuthGuard } from '../auth/guards/service-auth.guard';
import { AllowedApplicationsGuard } from '../auth/guards/allowed-applications.guard';
import { AllowedApplications } from '../auth/decorators/allowed-applications.decorator';
import { CurrentSeller } from '../auth/decorators/current-seller.decorator';
import type { AuthenticatedSeller } from '../auth/interfaces/authenticated-seller.interface';
import { SellersService } from './sellers.service';
import { UpdateSellerProfileDto } from './dto/update-seller-profile.dto';
import { UpdateSellerStatusDto } from './dto/update-seller-status.dto';
import { SellerStatus } from './enums/seller-status.enum';
import { Seller } from './entities/seller.entity';

@Controller('sellers')
export class SellersController {
  constructor(private readonly sellersService: SellersService) {}

  /** Profil du vendeur connecté (self-service). */
  @Get('me')
  @UseGuards(SellerJwtGuard)
  async getMe(@CurrentSeller() seller: AuthenticatedSeller): Promise<Seller> {
    return this.sellersService.findById(seller.sellerId);
  }

  @Patch('me')
  @UseGuards(SellerJwtGuard)
  async updateMe(
    @CurrentSeller() seller: AuthenticatedSeller,
    @Body() dto: UpdateSellerProfileDto,
  ): Promise<Seller> {
    return this.sellersService.updateProfile(seller.sellerId, dto);
  }

  /** Liste des vendeurs du club — réservé aux applications internes (teamManager). */
  @Get()
  @UseGuards(ServiceAuthGuard)
  async findAll(
    @Query('clubId') clubId: string,
    @Query('status') status?: SellerStatus,
  ): Promise<Seller[]> {
    return this.sellersService.findAllByClub(clubId, status);
  }

  @Get(':id')
  @UseGuards(ServiceAuthGuard)
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Seller> {
    return this.sellersService.findById(id);
  }

  /**
   * Décision du club sur le compte vendeur (approuver/suspendre/rejeter/
   * fermer). TASK-P0-027 : restreint explicitement à teamManager/
   * superadmin — un vendeur ne doit jamais pouvoir s'auto-approuver/
   * s'auto-réactiver, même si sellerPortal possède sa propre clé de
   * service pour d'autres usages (voir AllowedApplicationsGuard).
   */
  @Patch(':id/status')
  @UseGuards(ServiceAuthGuard, AllowedApplicationsGuard)
  @AllowedApplications('teamManager', 'superadmin')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('clubId') clubId: string,
    @Body() dto: UpdateSellerStatusDto,
  ): Promise<Seller> {
    return this.sellersService.updateStatus(id, clubId, dto);
  }
}
