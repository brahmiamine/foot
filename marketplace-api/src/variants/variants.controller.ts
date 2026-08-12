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
import { VariantsService } from './variants.service';
import { UpsertVariantDto } from './dto/upsert-variant.dto';
import { ProductVariant } from './entities/product-variant.entity';

/** Variantes (taille/couleur/...) d'un produit — self-service vendeur, scopé par produit possédé (US-06). */
@Controller('products/:productId/variants')
@UseGuards(SellerJwtGuard)
export class VariantsController {
  constructor(private readonly variantsService: VariantsService) {}

  @Get()
  async findAll(
    @CurrentSeller() seller: AuthenticatedSeller,
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<ProductVariant[]> {
    return this.variantsService.findAllForProduct(productId, seller.sellerId);
  }

  @Post()
  async create(
    @CurrentSeller() seller: AuthenticatedSeller,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: UpsertVariantDto,
  ): Promise<ProductVariant> {
    return this.variantsService.create(productId, seller.sellerId, dto);
  }

  @Patch(':id')
  async update(
    @CurrentSeller() seller: AuthenticatedSeller,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertVariantDto,
  ): Promise<ProductVariant> {
    return this.variantsService.update(id, productId, seller.sellerId, dto);
  }

  @Delete(':id')
  async remove(
    @CurrentSeller() seller: AuthenticatedSeller,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: true }> {
    await this.variantsService.remove(id, productId, seller.sellerId);
    return { success: true };
  }
}
