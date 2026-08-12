import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ServiceAuthGuard } from '../auth/guards/service-auth.guard';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductStatus } from './enums/product-status.enum';
import { Product } from './entities/product.entity';

/**
 * Miroir server-to-server de ProductsController, pour `sellerPortal`
 * (TS-04) : sellerPortal a déjà authentifié le vendeur via sa propre
 * session (SP_JWT_SECRET, indépendante du SELLER_JWT_SECRET de ce
 * service) — inutile de lui faire ré-obtenir un JWT marketplace-api.
 * `sellerId` est donc pris explicitement en paramètre plutôt que dérivé
 * d'un `SellerJwtGuard`, la confiance venant de `ServiceAuthGuard` (clé
 * API propre à sellerPortal). Même logique métier que ProductsController
 * (ProductsService), jamais dupliquée.
 */
@Controller('internal/products')
@UseGuards(ServiceAuthGuard)
export class InternalProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  async create(
    @Query('sellerId') sellerId: string,
    @Body() dto: CreateProductDto,
  ): Promise<Product> {
    return this.productsService.create(sellerId, dto);
  }

  @Patch(':id')
  async update(
    @Query('sellerId') sellerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<Product> {
    return this.productsService.update(id, sellerId, dto);
  }

  @Delete(':id')
  async remove(
    @Query('sellerId') sellerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: true }> {
    await this.productsService.remove(id, sellerId);
    return { success: true };
  }

  /** DRAFT -> SUBMITTED */
  @Post(':id/submit')
  async submit(
    @Query('sellerId') sellerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Product> {
    return this.productsService.sellerTransition(
      id,
      sellerId,
      ProductStatus.SUBMITTED,
    );
  }

  /** SUBMITTED/REJECTED -> DRAFT */
  @Post(':id/withdraw')
  async withdraw(
    @Query('sellerId') sellerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Product> {
    return this.productsService.sellerTransition(
      id,
      sellerId,
      ProductStatus.DRAFT,
    );
  }

  /** Active/désactive la visibilité, sans restriction de statut (voir ProductsService.toggleActive). */
  @Post(':id/toggle-active')
  async toggleActive(
    @Query('sellerId') sellerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Product> {
    return this.productsService.toggleActive(id, sellerId);
  }

  /**
   * Lecture optionnelle — utile pour vérifier un état côté serveur sans
   * repasser par TypeORM. sellerPortal continue de lire `sp_products`
   * directement pour ses pages (même table, pas un problème de cohérence),
   * cet endpoint n'est donc pas strictement nécessaire mais reste cohérent
   * avec le reste du contrôleur.
   */
  @Get(':id')
  async findOne(
    @Query('sellerId') sellerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Product> {
    return this.productsService.findOneForSeller(id, sellerId);
  }
}
