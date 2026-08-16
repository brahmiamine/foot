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
import { AllowedApplicationsGuard } from '../auth/guards/allowed-applications.guard';
import { AllowedApplications } from '../auth/decorators/allowed-applications.decorator';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductStatus } from './enums/product-status.enum';
import { Product } from './entities/product.entity';

@Controller('internal/products')
@UseGuards(ServiceAuthGuard, AllowedApplicationsGuard)
@AllowedApplications('seller-portal')
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

  @Post(':id/toggle-active')
  async toggleActive(
    @Query('sellerId') sellerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Product> {
    return this.productsService.toggleActive(id, sellerId);
  }

  @Get(':id')
  async findOne(
    @Query('sellerId') sellerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Product> {
    return this.productsService.findOneForSeller(id, sellerId);
  }
}
