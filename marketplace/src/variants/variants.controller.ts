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
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { ProductVariant } from './entities/product-variant.entity';

@Controller('products/:productId/variants')
@UseGuards(SellerJwtGuard)
export class VariantsController {
  constructor(private readonly variantsService: VariantsService) {}

  @Get()
  findAll(
    @CurrentSeller() seller: AuthenticatedSeller,
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<ProductVariant[]> {
    return this.variantsService.findAllForProduct(productId, seller.sellerId);
  }

  @Post()
  create(
    @CurrentSeller() seller: AuthenticatedSeller,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: CreateVariantDto,
  ): Promise<ProductVariant> {
    return this.variantsService.create(productId, seller.sellerId, dto);
  }

  @Patch(':id')
  update(
    @CurrentSeller() seller: AuthenticatedSeller,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVariantDto,
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

  @Post(':id/toggle-active')
  toggleActive(
    @CurrentSeller() seller: AuthenticatedSeller,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProductVariant> {
    return this.variantsService.toggleActive(id, productId, seller.sellerId);
  }
}
