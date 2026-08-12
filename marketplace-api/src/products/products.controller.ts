import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SellerJwtGuard } from '../auth/guards/seller-jwt.guard';
import { CurrentSeller } from '../auth/decorators/current-seller.decorator';
import type { AuthenticatedSeller } from '../auth/interfaces/authenticated-seller.interface';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductStatus } from './enums/product-status.enum';
import { Product } from './entities/product.entity';

/**
 * Catalogue vendeur self-service (US-05). Toutes les routes sont scopées au
 * vendeur authentifié (JWT) : impossible de lire/modifier le produit d'un
 * autre vendeur. Les transitions de modération (SUBMITTED -> UNDER_REVIEW ->
 * APPROVED/REJECTED -> PUBLISHED) vivent dans ModerationModule, jamais ici.
 */
@Controller('products')
@UseGuards(SellerJwtGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  async create(
    @CurrentSeller() seller: AuthenticatedSeller,
    @Body() dto: CreateProductDto,
  ): Promise<Product> {
    return this.productsService.create(seller.sellerId, dto);
  }

  @Get()
  async findAll(
    @CurrentSeller() seller: AuthenticatedSeller,
  ): Promise<Product[]> {
    return this.productsService.findAllBySeller(seller.sellerId);
  }

  @Get(':id')
  async findOne(
    @CurrentSeller() seller: AuthenticatedSeller,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Product> {
    return this.productsService.findOneForSeller(id, seller.sellerId);
  }

  @Patch(':id')
  async update(
    @CurrentSeller() seller: AuthenticatedSeller,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<Product> {
    return this.productsService.update(id, seller.sellerId, dto);
  }

  @Delete(':id')
  async remove(
    @CurrentSeller() seller: AuthenticatedSeller,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: true }> {
    await this.productsService.remove(id, seller.sellerId);
    return { success: true };
  }

  /** Active/désactive la visibilité, sans restriction de statut (voir ProductsService.toggleActive). */
  @Post(':id/toggle-active')
  async toggleActive(
    @CurrentSeller() seller: AuthenticatedSeller,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Product> {
    return this.productsService.toggleActive(id, seller.sellerId);
  }

  /** DRAFT -> SUBMITTED : envoie le produit à la modération du club. */
  @Post(':id/submit')
  async submit(
    @CurrentSeller() seller: AuthenticatedSeller,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Product> {
    return this.productsService.sellerTransition(
      id,
      seller.sellerId,
      ProductStatus.SUBMITTED,
    );
  }

  /**
   * SUBMITTED -> DRAFT (retrait avant traitement) ou REJECTED -> DRAFT
   * (préparation d'une resoumission après correction, US-11) : les deux
   * partagent la même cible et donc le même endpoint côté vendeur.
   */
  @Post(':id/withdraw')
  async withdraw(
    @CurrentSeller() seller: AuthenticatedSeller,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Product> {
    return this.productsService.sellerTransition(
      id,
      seller.sellerId,
      ProductStatus.DRAFT,
    );
  }
}
